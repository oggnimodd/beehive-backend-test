import app from "@/main";
import supertest from "supertest";
import { API_PREFIX } from "./constants.helper";

export const apiUrl = (path: string): string => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  let prefix = API_PREFIX;
  if (prefix.endsWith("/")) {
    prefix = prefix.slice(0, -1);
  }
  return `${prefix}${normalizedPath}`;
};

export const request = supertest(app);
