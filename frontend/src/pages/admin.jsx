import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";

export default function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [editingModeratorEmail, setEditingModeratorEmail] = useState(null);
  const [moderatorSkills, setModeratorSkills] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  const token = localStorage.getItem("token");

  useEffect(() => {
    // In a real app, the user's role should be verified securely,
    // ideally from a decoded JWT token managed by a global state or context.
    // This is a client-side check for better UX.
    // The backend API must enforce this rule as well.
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      if (!user || user.role !== "admin") {
        console.error("Access Denied: User is not an admin.");
        navigate("/"); // Redirect non-admins to the home page
      }
    } catch (e) {
      navigate("/");
    }

    fetchUsers();
  }, [navigate]);

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/auth/users`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok) {
        setUsers(data);
      } else {
        console.error(data.error);
      }
    } catch (err) {
      console.error("Error fetching users", err);
    }
  };

  const handleUpdateUser = async (email, role, skills) => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SERVER_URL}/auth/update-user`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ email, role, skills }),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        console.error(data.error || "Failed to update user");
        return;
      }

      // Refresh user list to reflect the change
      fetchUsers();
    } catch (err) {
      console.error("User update failed", err);
    }
  };

  const handleRoleChange = async (email, newRole) => {
    const user = users.find((u) => u.email === email);
    if (user) {
      await handleUpdateUser(email, newRole, user.skills || []);
    }
  };

  const handleEditSkillsClick = (user) => {
    setEditingModeratorEmail(user.email);
    setModeratorSkills(user.skills?.join(", ") || "");
  };

  const handleCancelEdit = () => {
    setEditingModeratorEmail(null);
    setModeratorSkills("");
  };

  const handleSkillsUpdate = async (email) => {
    const skills = moderatorSkills.split(",").map((s) => s.trim()).filter(Boolean);
    await handleUpdateUser(email, "moderator", skills);
    handleCancelEdit();
  };

  const handleSearch = (e) => {
    setSearchQuery(e.target.value.toLowerCase());
  };

  const { moderators, regularUsers } = useMemo(() => {
    const filtered = searchQuery
      ? users.filter((user) => user.email.toLowerCase().includes(searchQuery))
      : users;

    return {
      moderators: filtered.filter((user) => user.role === "moderator"),
      regularUsers: filtered.filter((user) => user.role === "user"),
    };
  }, [users, searchQuery]);

  return (
    <div className="max-w-4xl mx-auto mt-10 p-4">
      <h1 className="text-3xl font-bold mb-6">Admin Panel - User Management</h1>
      <input
        type="text"
        className="input input-bordered w-full mb-8"
        placeholder="Search by email..."
        value={searchQuery}
        onChange={handleSearch}
      />

      {/* Moderators Section */}
      <div className="mb-10">
        <h2 className="text-2xl font-semibold mb-4 border-b pb-2">
          Moderators
        </h2>
        {moderators.length > 0 ? (
          <div className="space-y-4">
            {moderators.map((user) => (
              <div
                key={user._id}
                className="bg-base-100 shadow rounded p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4 border"
              >
                <div>
                  <p>
                    <strong>Email:</strong> {user.email}
                  </p>
                  {editingModeratorEmail === user.email ? (
                    <div className="mt-2">
                      <label className="form-control w-full max-w-xs">
                        <div className="label">
                          <span className="label-text">
                            Skills (comma-separated)
                          </span>
                        </div>
                        <input
                          type="text"
                          placeholder="e.g., javascript, react, css"
                          className="input input-bordered w-full"
                          value={moderatorSkills}
                          onChange={(e) => setModeratorSkills(e.target.value)}
                        />
                      </label>
                    </div>
                  ) : (
                    <p className="mt-1">
                      <strong>Skills:</strong>{" "}
                      {user.skills && user.skills.length > 0
                        ? user.skills.join(", ")
                        : "N/A"}
                    </p>
                  )}
                </div>
                <div className="flex-shrink-0 flex flex-wrap gap-2 self-end sm:self-center">
                  {editingModeratorEmail === user.email ? (
                    <>
                      <button className="btn btn-success btn-sm" onClick={() => handleSkillsUpdate(user.email)}>Save Skills</button>
                      <button className="btn btn-ghost btn-sm" onClick={handleCancelEdit}>Cancel</button>
                    </>
                  ) : (
                    <>
                      <button className="btn btn-secondary btn-sm" onClick={() => handleEditSkillsClick(user)}>Edit Skills</button>
                      <button className="btn btn-warning btn-sm" onClick={() => handleRoleChange(user.email, "user")}>Demote to User</button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p>No moderators found.</p>
        )}
      </div>

      {/* Users Section */}
      <div>
        <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Users</h2>
        {regularUsers.length > 0 ? (
          <div className="space-y-4">
            {regularUsers.map((user) => (
              <div
                key={user._id}
                className="bg-base-100 shadow rounded p-4 flex justify-between items-center border"
              >
                <div>
                  <p>
                    <strong>Email:</strong> {user.email}
                  </p>
                  <p>
                    <strong>Skills:</strong>{" "}
                    {user.skills && user.skills.length > 0
                      ? user.skills.join(", ")
                      : "N/A"}
                  </p>
                </div>
                <button
                  className="btn btn-info btn-sm"
                  onClick={() => handleRoleChange(user.email, "moderator")}
                >
                  Promote to Moderator
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p>No users found.</p>
        )}
      </div>
    </div>
  );
}