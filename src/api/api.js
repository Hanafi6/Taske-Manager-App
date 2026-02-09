const BASE_URL = "http://localhost:5000";

export const getData = async (endpoint) => {
  const res = await fetch(`${BASE_URL}/${endpoint}`);
  return res.json();
};

export const postData = async (endpoint, data) => {
  const res = await fetch(`${BASE_URL}/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
};

export const updateData = async (endpoint, id, data) => {

  const res = await fetch(`${BASE_URL}/${endpoint}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json()
};

export const deleteData = async (endpoint, id) => {
  const res = await fetch(`${BASE_URL}/${endpoint}/${id}`, { method: "DELETE" });
  return res.json();
};
