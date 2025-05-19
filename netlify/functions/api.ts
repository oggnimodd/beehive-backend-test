import serverless from "serverless-http";
import app from "../../src/main";

export const handler = async (event: any, context: any) => {
  const serverlessHandler = serverless(app);
  try {
    const result = await serverlessHandler(event, context);
    return result;
  } catch (error) {
    console.error("Error in serverless-http handler:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Handler internal error" }),
      headers: { "Content-Type": "application/json" },
    };
  }
};
