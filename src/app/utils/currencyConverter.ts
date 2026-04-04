import axios from "axios";
import AppError from "../errorHelpers/AppError";
import { StatusCodes } from "http-status-codes";

export const anyCurrencyToUSD = async (amount: number, fromCurrency: string) => {
    const resp = await axios.get(
        `https://api.frankfurter.dev/v2/rates?base=${fromCurrency.toUpperCase()}&quotes=USD`
      );

    if (resp.statusText !== 'OK' && resp.status !== 200) {
        throw new AppError(StatusCodes.BAD_REQUEST, "Currency converts api failed");
    } 

    const rate = resp.data[0].rate;
    const calculate = amount * rate;
    
      return Number(calculate.toFixed(2));
}