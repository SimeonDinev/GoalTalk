import * as request from "../lib/request";

const baseUrl = "http://localhost:3030/data/clubs";

export const getAll = async () => {
  const result = await request.get(baseUrl);

  return Object.values(result);
};

export const getOne = async (clubId) => {
  const result = await request.get(`${baseUrl}/${clubId}`);

  return result;
};
