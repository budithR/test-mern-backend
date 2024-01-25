const express = require('express');
const router = express.Router();
const User = require('../models/User');
const ForgetPassword = require('../models/ForgetPassword');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const { route } = require('./userRoutes');

// Forgot Password
router.post('/', async (req, res) => {
    try {
      const { email } = req.body;
      const user = await User.findOne({ email });
  
      if (!user) {
        return res.status(404).send('User not found');
      }
  
      // Generate a 6-digit PIN
      const pin = Math.floor(100000 + Math.random() * 900000);
  
      try {
        const newForgetPassword = new ForgetPassword({ email: user.email, pin: pin });
        await newForgetPassword.save();
        res.status(201).json(newForgetPassword);
      } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
      }

      // Store the PIN in the user document (you might want to encrypt it or use a dedicated "forgot password" collection)
      user.forgotPasswordPin = pin;
      await user.save();
  
      // Send reset link to user's email
      const transporter = nodemailer.createTransport({
        // Configure your email sending service (e.g., Gmail)
        service: 'gmail',
        auth: {
          user: 'budithdev@gmail.com',
          pass: 'budithdev123',
        },
      });
  
      const mailOptions = {
        from: 'budithdev@gmail.com',
        to: user.email,
        subject: 'Password Reset PIN',
        text: `Your 6-digit PIN for password reset is: ${pin}`,
      };
  
      await transporter.sendMail(mailOptions);
      res.send('Password reset PIN sent to your email');
    } catch (error) {
      console.error(error);
      res.status(500).send('Server Error');
    }
  });

  module.exports = router;