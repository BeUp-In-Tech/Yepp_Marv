import User from "../modules/user/user.model";

export const  removeTokenFromOtherUsers = async (token: string, currentUserId: string) => {
  await User.updateMany(
    { "deviceTokens.token": token, _id: { $ne: currentUserId } },
    { $pull: { deviceTokens: { token } } }
  );
}