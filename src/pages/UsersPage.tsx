import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchUsers, addUser } from "../slices/usersSlice";
import UserCard from "../components/UserCard";

export default function UsersPage() {
  const dispatch = useDispatch();
  const { list, loading } = useSelector((state) => state.users);

  useEffect(() => {
    dispatch(fetchUsers());
  }, [dispatch]);

  const handleAdd = () => {
    // dispatch(addUser({ name: "Mahmoud", role: "Developer" }));
    console.log(true)
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div className="p-6">
      <button
        onClick={handleAdd}
        className="bg-blue-600 text-white px-4 py-2 rounded mb-4"
      >
        Add User
      </button>
      <div className="grid gap-3">
        {list?.map((u) => (
          <UserCard key={u.id} user={u} />
        ))}
      </div>
    </div>
  );
}
