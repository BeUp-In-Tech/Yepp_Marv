import { redisClient } from "../config/redis.config";

export async function invalidateAllMachineryCache() {
  let cursor = "0";
  const pattern = "machinery:*";

  do {
    const { cursor: newCursor, keys } = await redisClient.scan(cursor, {
      MATCH: pattern,
      COUNT: 100,
    });

    cursor = newCursor;

    if (keys.length) {
      await redisClient.del(keys);
    }
  } while (cursor !== "0");
}