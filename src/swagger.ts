import swaggerAutogen from "swagger-autogen";
import { config } from "@/config";

const doc = {
  info: {
    version: "v1.0.0",
    title: "Swagger Demo Project",
    description: "Implementation of Swagger with TypeScript",
  },
  servers: [
    {
      url: `http://localhost:${config.port}`,
      description: "",
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
      },
    },
  },
};

const outputFile = "./swagger_output.json";
const endpointsFiles = ["./src/routes/index.ts"];

swaggerAutogen({ openapi: "3.0.0" })(outputFile, endpointsFiles, doc);
