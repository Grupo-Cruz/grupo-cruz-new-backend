import { OpenAI } from "openai";

export default class ChatGPT {
    private model: string = "gpt-4.1";
    private client: OpenAI;

    constructor (client: OpenAI, model?: string) {
        this.model = model || this.model;
        this.client = client;
    }

    askToChatGPT = async (input: string) => {
        const response = await this.client.responses.create({
            model: this.model,
            input
        });

        console.log({ response });
        return response.output_text;
    }
}