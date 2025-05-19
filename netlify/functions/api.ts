import serverless from "serverless-http";
import app from "../../src/main";

export const handler = serverless(app);
