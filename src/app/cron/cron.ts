import { cleanup_payment_and_promotion } from "./cleanupPayment_promotion"
import { expiredDealsHandler } from "./expiredDealCronHandle";
import { expiredPomotionsHandler } from "./expirePromotionHandle";


export const runCron = () => {
    cleanup_payment_and_promotion();
    expiredDealsHandler();
    expiredPomotionsHandler();
}
