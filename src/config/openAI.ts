import OpenAI from "openai";
import * as dotenv from "dotenv";

dotenv.config();

const client = new OpenAI();

export { client };