const BASE_URL = "http://localhost:5000";

export const getData = async <T = unknown>(endpoint: string): Promise<T> => {
  const res = await fetch(`${BASE_URL}/${endpoint}`);
  if (!res.ok) throw new Error(`Failed to fetch: ${res.statusText}`);
  return res.json() as Promise<T>;
};

export const postData = async <T>(endpoint: string, data: T): Promise<T> => {
  const res = await fetch(`${BASE_URL}/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to post data: ${res.statusText}`);
  return res.json() as Promise<T>;
};

export const updateData = async <T>(
  endpoint: string,
  id: string | number,
  data: Partial<T>
): Promise<T> => {
  const res = await fetch(`${BASE_URL}/${endpoint}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to update data: ${res.statusText}`);
  return res.json() as Promise<T>;
};

export const deleteData = async (endpoint: string, id: string | number): Promise<void> => {
  const res = await fetch(`${BASE_URL}/${endpoint}/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(`Failed to delete data: ${res.statusText}`);
};
