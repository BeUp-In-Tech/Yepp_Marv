import { StatusCodes } from "http-status-codes";
import AppError from "../../errorHelpers/AppError";
import { IAuthProvider, IUser, Role,   } from "./user.interface";
import User from "./user.model";
import { JwtPayload } from "jsonwebtoken";


// CREATE VENDOR SERVICE
const registerUser = async (payload: IUser) => {
     const { email, ...rest } = payload;

  const isVendor = await User.findOne({ email });
  if (isVendor) {
    throw new AppError(400, 'User aleready exist. Please login!');
  }

  // Save User Auth
  const authUser: IAuthProvider = {
    provider: 'credentials',
    providerId: payload.email as string,
  };

  const userPayload = {
    email,
    auths: [authUser],
    ...rest,
  };

  // Create user
  const creatUser = await User.create(userPayload); 
  return creatUser;
}

// UPDATE USER
const updateUser = async (user: JwtPayload, payload: Partial<IUser>) => {

  // Allowed field to update data
  const ALLOWED_FIELDS = ['user_name'];

  // Ensure that the user is not attempting to change their password
  if (payload.password) {
    throw new AppError(StatusCodes.BAD_REQUEST, "You can't change your password from here");
  }

  // Ensure that role modification is only allowed for admin users
  if (payload.role) {
    if (user.role !== Role.ADMIN) {
      throw new AppError(StatusCodes.FORBIDDEN, "You can't change your role");
    }
    // Validate that the provided role is a valid role
    if (!Object.values(Role).includes(payload.role)) {
      throw new AppError(StatusCodes.BAD_REQUEST, 'Invalid role');
    }
  }

    Object.keys(payload).forEach((key) => {
      if (!ALLOWED_FIELDS.includes(key)) {
        throw new AppError(StatusCodes.BAD_REQUEST, `Field '${key}' is not allowed to be updated`);
      }
    });
 
  
  const update = await User.findByIdAndUpdate(user.userId, payload, {runValidators: true, new: true});

  return update;
};




export const userServices = {
    registerUser,
    updateUser
}