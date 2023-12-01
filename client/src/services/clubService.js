const baseURL = "http://localhost:3030/data";

export const getClubs = () => {
  const x = fetch(`${baseURL}/clubs`)
    .then((response) => response.json())
    .catch((error) => {
      console.error("Fetch error:", error);
    });
  return x;
};
