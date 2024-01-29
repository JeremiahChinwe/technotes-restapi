const User = require("../models/UserModel")
const Note = require("../models/NoteModel")
const bcrypt = require("bcrypt")


const getAllUsers = async (req, res) => {
    const users = await User.find().select("-password").lean()

    if (!users?.length) {
        return res.status(400).json({ message: "No users found" })
    }

    res.json(users)
}


const createNewUser = async (req, res) => {
    const { username, password, roles } = req.body

    // Confirm data
    if (!username || !password) {
        return res.status(400).json({ message: "All fields are required"})
    }

    // Check for duplicate username
    const duplicate = await User.findOne({ username }).collation({ locale: "en", strength: 2 }).lean().exec()

    if (duplicate) {
        return res.status(409).json({ message: "Duplicate username" })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    const userObject = (!Array.isArray(roles) || !roles.length)
        ? { username, "password": hashedPassword }
        : { username, "password": hashedPassword, roles}
    
    // Create and store new user
    const user = await User.create(userObject)

    if (user) {
        return res.status(201).json({ message: `New user ${username} created`})
    } else {
        return res.status(400).json({ message: "Invalid user data received" })
    }
}


const updateUser = async (req, res) => {
    const { id, username, roles, active, password } = req.body

    // Confirm data
    if (!id || !username || !Array.isArray(roles) || !roles.length || typeof active !== "boolean") {
        return res.status(400).json({ message: "All fields except password is required"})
    }

    // Does the user exist to update?
    const user = await User.findById(id).exec()

    if (!user) {
        return res.status(400).json({ message: "User not found!" })
    }

    // Check for duplicate username
    const duplicate = await User.findOne({ username }).collation({ locale: "en", strength: 2 }).lean().exec()

    // Allow updates to the original user
    if (duplicate && duplicate._id.toString() !== id) {
        return res.status(409).json({ message: "Duplicate username" })
    }

    user.username = username,
    user.roles = roles
    user.active = active

    if (password) {
        user.password = await bcrypt.hash(password, 10)
    }

    const updatedUser = await user.save()

    res.json({ message: `${updatedUser.username} updated` })
}


const deleteUser = async (req, res) => {
    const { id } = req.body

    // Confirm data
    if (!id) {
        return res.status(400).json({ message: "User ID required" })
    }

    // Does the user still have assigned notes?
    const note = await Note.findOne({ user: id }).lean().exec()

    if (note) {
        return res.status(400).json({ message: "User has assigned notes" })
    }

    // Does the user exist to delete?
    const user = await User.findById(id).exec()

    if (!user) {
        return res.status(400).json({ message: "User not found" })
    }

    const deletedUser = await user.deleteOne()

    res.json(`${user.username} with ID ${user._id} deleted`)
}


module.exports = {
    getAllUsers,
    createNewUser,
    updateUser,
    deleteUser
}