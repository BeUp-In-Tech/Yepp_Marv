/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-console */
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import {
  Strategy as GoogleStrategy,
  Profile,
  VerifyCallback,
} from 'passport-google-oauth20';
import bcrypt from 'bcrypt';
import env from './env';
import { Role } from '../modules/user/user.interface';
import User from '../modules/user/user.model';
import AppleStrategy from 'passport-apple';
import jwt from "jsonwebtoken";

// CREDENTIALS LOGIN LOCAL STRATEGY
passport.use(
  new LocalStrategy(
    { usernameField: 'email', passwordField: 'password' },
    async (email: string, password: string, done: any) => {
      try {
        const user = await User.findOne({ email });

        if (!user) {
          return done(null, false, { message: 'User does not exist!' });
        }

        const isGoogleUser = user.auths?.some(
          (provider) => provider.provider === 'google'
        );
        const isAppleUser = user.auths?.some(
          (provider) => provider.provider === 'apple'
        );

        if (isGoogleUser) {
          return done(null, false, {
            message:
              'You are authenticate through Google. Try to login with Google',
          });
        }

        if (isAppleUser) {
          return done(null, false, {
            message:
              'You are authenticate through Apple. Try to login with Apple',
          });
        }

        // Matching Password
        const isMatchPassword = await bcrypt.compare(
          password,
          user.password as string
        );

        if (!isMatchPassword) {
          return done(null, false, { message: 'Password incorrect!' });
        }

        return done(null, user);
      } catch (error) {
        console.log('Passport Local login error: ', error);
        done(error);
      }
    }
  )
);

// USER GOOGLE REGISTER STRATEGY
passport.use(
  new GoogleStrategy(
    {
      clientID: env.GOOGLE_OAUTH_ID,
      clientSecret: env.GOOGLE_OAUTH_SECRET,
      callbackURL: env.GOOGLE_CALLBACK_URL,
    },

    async (
      _accessToken: string,
      _refreshToken: string,
      profile: Profile,
      done: VerifyCallback
    ) => {
      try {
        const email = profile.emails?.[0].value;

        if (!email) {
          return done(null, false, { message: 'No email found' });
        }

        let user = await User.findOne({ email });

        if (!user) {
          user = await User.create({
            user_name: profile.displayName,
            email,
            role: Role.VENDOR,
            isVerified: true,
            auths: [
              {
                provider: 'google',
                providerId: profile.id,
              },
            ],
          });
        }

        return done(null, user);
      } catch (error) {
        console.log('Google strategy error', error);
        done(error);
      }
    }
  )
);

const privateKey = env.APPLE_PRIVATE_KEY.replace(/\\n/g, '\n');

// USER APPLE REGISTER STRATEGY
passport.use(
  new AppleStrategy(
    {
      clientID: env.APPLE_WEB_CLIENT_ID,
      teamID: env.APPLE_TEAM_ID,
      callbackURL: env.APPLE_WEB_REDIRECT_URI,
      keyID: env.APPLE_KEY_ID,
      privateKeyString: privateKey
    },
    async function (req, accessToken, refreshToken, idToken, profile, cb) {
      try {
        const decoded: any = jwt.decode(idToken);
        const appleSub = decoded?.sub;
        const email = decoded?.email;
        const parsedUser = JSON.parse(req.body?.user); // PARSE USER DATA


        // 🔑 1. find by providerId FIRST
        let user = await User.findOne({
          auths: {
            $elemMatch: {
              provider: "apple",
              providerId: appleSub,
            },
          },
        });

        // 2. fallback: email linking (only if exists)
        if (!user && email) {
          user = await User.findOne({ email });

          if (user) {
            if (!user.auths) user.auths = [];
            user.auths.push({
              provider: "apple",
              providerId: appleSub,
            });
            await user.save();
          }
        }

        // 👤 3. create user (first login)
        if (!user) {
          if (!email) {
            return cb(new Error("Email not provided by Apple"));
          }

          user = await User.create({
            user_name: req.body?.user ? `${parsedUser?.name?.firstName} ${parsedUser?.name?.lastName}` : "Apple User" ,
            email,
            role: Role.VENDOR,
            isVerified: true,
            auths: [
              {
                provider: "apple",
                providerId: appleSub,
              },
            ],
          });
        }

        return cb(null, user);
      } catch (error) {
        console.log("Apple strategy error", error);
        const err = error instanceof Error ? error : new Error(String(error));
        cb(err);
      }
    }
  )
);

passport.serializeUser((user: any, done: (err: any, id?: unknown) => void) => {
  done(null, user._id);
});

passport.deserializeUser(async (id: string, done: any) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    console.log(error);
    done(error);
  }
});
