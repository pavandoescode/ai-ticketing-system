import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../modals/user.js";
import { inngest } from "../inngest/client.js";

export const signup = async (req, res) => {
  const { email, password, skills = [] } = req.body;
  try {
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ email, password: hashed, skills });

    //Fire inngest event

    await inngest.send({
      name: "user/signup",
      data: {
        email,
      },
    });

    const token = jwt.sign(
      { _id: user._id, role: user.role },
      process.env.JWT_SECRET
    );

    // Avoid sending the hashed password back to the client
    const userResponse = {
      _id: user._id,
      email: user.email,
      role: user.role,
      skills: user.skills,
    };
    res.json({ user: userResponse, token });
  } catch (error) {
    res.status(500).json({ error: "Signup failed", details: error.message });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { _id: user._id, role: user.role },
      process.env.JWT_SECRET
    );

    const userResponse = user.toObject();
    delete userResponse.password;

    res.json({ user: userResponse, token });
  } catch (error) {
    res.status(500).json({ error: "Login failed", details: error.message });
  }
};

export const logout = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const token = authHeader.split(" ")[1];
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) return res.status(401).json({ error: "Unauthorized" });
      res.json({ message: "Logout successfully" });
    });
  } catch (error) {
    res.status(500).json({ error: "Logout failed", details: error.message });
  }
};

export const updateUser = async (req, res) => {
  const { skills = [], role, email } = req.body;
  try {
    if (req.user?.role !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: "User not found" });

    await User.updateOne(
      { email },
      { skills: skills.length ? skills : user.skills, role }
    );
    return res.json({ message: "User updated successfully" });
  } catch (error) {
    res.status(500).json({ error: "Update failed", details: error.message });
  }
};

export const getUsers = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }

    const users = await User.find().select("-password");
    return res.json(users);
  } catch (error) {
    res.status(500).json({ error: "Failed to get users", details: error.message });
  }
};