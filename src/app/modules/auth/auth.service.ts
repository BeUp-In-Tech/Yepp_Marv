import { StatusCodes } from 'http-status-codes';
import AppError from '../../errorHelpers/AppError';
import User from '../user/user.model';
import bcrypt from 'bcrypt';
import { randomOTPGenerator } from '../../utils/randomOTPGenerator';
import { redisClient } from '../../config/redis.config';
import { sendEmail } from '../../utils/sendMail';
import { IsActiveUser } from '../user/user.interface';
import env from '../../config/env';
import jwt, { JwtPayload, SignOptions } from 'jsonwebtoken';
import { verifyToken } from '../../utils/jwt';
import { createUserTokens } from '../../utils/user.tokens';
import axios from 'axios';
import qs from 'querystring';



// CHANGE PASSWORD
const changePasswordService = async (
  userId: string,
  oldPassword: string,
  newPassword: string
) => {
  const user = await User.findById(userId).select('+password');
  if (!user) {
    throw new AppError(StatusCodes.NOT_FOUND, 'User not found!');
  }

  if (!oldPassword) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      'Please provide your old password!'
    );
  }

  if (!newPassword) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      'Please provide your new password!'
    );
  }

  const matchPassword = await bcrypt.compare(
    oldPassword,
    user.password as string
  );
  if (!matchPassword) {
    throw new AppError(StatusCodes.BAD_REQUEST, "Password doesn't matched!");
  }

  //   console.log(newPassword);

  user.password = newPassword;
  await user.save();

  return null;
};

// FORGET PASSWORD
const forgetPasswordService = async (email: string) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new AppError(StatusCodes.NOT_FOUND, 'User not found!');
  }

  if (user.isDeleted) {
    throw new AppError(StatusCodes.BAD_REQUEST, 'User was deleted!');
  }

  if (
    user.isActive === IsActiveUser.INACTIVE ||
    user.isActive === IsActiveUser.BLOCKED
  ) {
    throw new AppError(StatusCodes.BAD_REQUEST, `User is ${user.isActive}`);
  }

  const otp = randomOTPGenerator(100000, 999999).toString(); // Generate OTP
  const hashedOTP = await bcrypt.hash(otp, Number(env.BCRYPT_SALT_ROUND)); // Hashed OTP

  // CACHED OTP TO REDIS
  await redisClient.set(`otp:${user.email}`, hashedOTP, { EX: 120 }); // 2 min

  // SENDING OTP TO EMAIL
  await sendEmail({
    to: user.email,
    subject: 'LinkUp:Password Reset OTP',
    templateName: 'forgetPassword_otp_send',
    templateData: {
      name: user.user_name,
      expirationTime: 2,
      otp,
    },
  });

  return null;
};

// VERIFY RESET PASSWORD OTP
const verifyForgetPasswordOTPService = async (email: string, otp: string) => {
  if (!email) {
    throw new AppError(StatusCodes.BAD_REQUEST, 'Email required!');
  }

  // CHECK USER
  const user = await User.findOne({ email });
  if (!user) {
    throw new AppError(StatusCodes.NOT_FOUND, 'No user found!');
  }

  if (!otp || otp.length < 6) {
    throw new AppError(StatusCodes.BAD_REQUEST, 'Wrong OTP!');
  }

  // OTP MATCHING PART
  const getOTP = await redisClient.get(`otp:${email}`);

  if (!getOTP) {
    throw new AppError(StatusCodes.BAD_REQUEST, 'OTP has expired!');
  }

  // Matching otp
  const isOTPMatched = await bcrypt.compare(otp, getOTP); // COMPARE WITH OTP
  if (!isOTPMatched) {
    throw new AppError(StatusCodes.BAD_REQUEST, 'OTP is not matched!');
  }

  const jwtPayload = { email, verified: true };
  const jwtToken =  jwt.sign(jwtPayload, env.OTP_JWT_ACCESS_SECRET, {
    expiresIn: env.OTP_JWT_ACCESS_EXPIRATION,
  } as SignOptions);

  // DELETED OTP AFTER USED
  await redisClient.del(`otp:${email}`);
  return jwtToken;
};

// RESET PASSWORD
const resetPasswordService = async (token: string, newPassword: string) => {
  if (!token) {
    throw new AppError(StatusCodes.BAD_REQUEST, 'Token must required!');
  }

  const verifyToken = jwt.verify(
    token,
    env.OTP_JWT_ACCESS_SECRET
  ) as JwtPayload;

  

  if (!verifyToken) {
    throw new AppError(StatusCodes.BAD_REQUEST, 'Invalid token or expired!');
  }

  if (!verifyToken?.verified) {
    throw new AppError(StatusCodes.BAD_REQUEST, "OTP wasn't verfied yet");
  }

  // CHECK USER
  const user = await User.findOne({ email: verifyToken?.email });
  if (!user) {
    throw new AppError(StatusCodes.NOT_FOUND, 'No user found!');
  }

  // SET NEW PASSWORD
  user.password = newPassword;
  await user.save();

  return null;
};

// GET NEW ACCESS TOKEN
// GET NEW ACCESS TOKEN
const getNewAccessTokenService = async (refreshToken: string) => {
  if (!refreshToken) {
    throw new AppError(StatusCodes.NOT_FOUND, 'Refresh token needed!');
  }

  const tokenVerify = verifyToken(
    refreshToken,
    env.JWT_REFRESH_SECRET
  ) as JwtPayload; // VERIFY TOKEN
  const isUserExists = await User.findById(tokenVerify.userId as string); // FIND USER BY ID

  if (!isUserExists) {
    throw new AppError(StatusCodes.BAD_REQUEST, "User Doesn't Exist");
  }

  if (
    isUserExists.isActive === IsActiveUser.BLOCKED ||
    isUserExists.isActive === IsActiveUser.INACTIVE
  ) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      'The User "blocked" or "inactive"'
    );
  }

  if (isUserExists.isDeleted) {
    throw new AppError(StatusCodes.BAD_REQUEST, 'The user was "deleted"');
  }

  const jwtPayload = {
    _id: isUserExists?._id,
    email: isUserExists?.email,
    role: isUserExists?.role,
  };

  const userToken = await createUserTokens(jwtPayload); // Jsonwebtoken

  return {
    newAccessToken: userToken.accessToken,
    newRefreshToken: userToken.refreshToken,
  };
};




// Apple client secret generator (JWT signed with Apple private key)
const generateAppleClientSecret =  async ()=> {
  const privateKey = env.APPLE_PRIVATE_KEY.replace(/\\n/g, '\n');
  const clientSecret = jwt.sign(
    {
      iss: env.APPLE_TEAM_ID,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 15777000, // 6 months
      aud: 'https://appleid.apple.com',
      sub: env.APPLE_IOS_CLIENT_ID
    },
    privateKey,
    { algorithm: 'ES256', keyid: env.APPLE_KEY_ID }
  );
  return clientSecret;
}

// Exchange code for tokens
const  appleLoginService = async (code: string) => {
  const clientSecret = await generateAppleClientSecret();

  const tokenResponse = await axios.post(
    'https://appleid.apple.com/auth/token',
    qs.stringify({
      grant_type: 'authorization_code',
      code,
      client_id: env.APPLE_IOS_CLIENT_ID,
      client_secret: clientSecret,
      redirect_uri: env.APPLE_WEB_REDIRECT_URI
    }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );

  const { id_token, access_token } = tokenResponse.data;
  
  
  // Decode Apple JWT
  const decoded = jwt.decode(id_token);
  console.log(decoded, access_token);


  // response
 /* {

  iss: 'https://appleid.apple.com',
  aud: 'agency.beuptech.yepp',
  exp: 1773662563,
  iat: 1773576163,
  sub: '001452.2b850f37f0784c329308e5cee10e499a.0418',
  at_hash: 'pcIwH0NtGLRLiWdq8pgHrg',
  email: 'avizitrx@protonmail.com',
  email_verified: true,
  auth_time: 1773576162,
  nonce_supported: true
}
*/
  // Example: { sub: 'appleUserId', email: 'user@example.com', ... }
  // const userCreate = await User.create(decoded);

  // Create your own JWT
  // const appToken = jwt.sign({ _id: userCreate._id }, env.JWT_ACCESS_SECRET, { expiresIn: '7d' });

  // return { token: appToken, user: userCreate };
  return decoded;
}

export const authService = {
  changePasswordService,
  forgetPasswordService,
  verifyForgetPasswordOTPService,
  resetPasswordService,
  getNewAccessTokenService,
  appleLoginService
};
