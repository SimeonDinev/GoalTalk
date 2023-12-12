import * as request from "../lib/request";

const baseUrl = "http://localhost:3030/data/";

export const getAll = async () => {
  const result = await request.get(`${baseUrl}clubs`);

  return Object.values(result);
};

export const getOne = async (clubId) => {
  const result = await request.get(`${baseUrl}clubs/${clubId}`);

  return result;
};

export const getDetails = async (clubId) => {
  const result = await request.get(`${baseUrl}clubDetails/${clubId}`);

  return result;
};
