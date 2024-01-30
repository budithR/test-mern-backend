const express = require('express');
const router = express.Router();
const User = require('../models/User');
const ForgetPassword = require('../models/ForgetPassword');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const { route } = require('./userRoutes');

// Forgot Password
router.post('/', async (req, res, next) => {
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

        // Store the PIN in the user document (you might want to encrypt it or use a dedicated "forgot password" collection)
        user.forgotPasswordPin = pin;
        await user.save();

        // Send reset link to user's email
        const transporter = nodemailer.createTransport({
            host: "smtp-relay.brevo.com",
            port: 587,
            auth: {
                user: 'budithdev@gmail.com',
                pass: 'xsmtpsib-fc4a914af0ee5f19ef42f8ae6e6e525e731f649507247ba9a7adff9398937382-qWM2I7gtfkbZVLSw',
            },
        });

        const mailOptions = {
            from: 'budithdev@gmail.com',
            to: user.email,
            subject: 'Password Reset PIN',
            text: `Your 6-digit PIN for password reset is: ${pin}`,
        };

        await transporter.sendMail(mailOptions);

        // Send response only once after successful PIN generation and email sending
        res.status(200).json({
          message: 'Password reset PIN sent to your email',
          email: user.email
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
  } catch (error) {
      console.error(error);
      res.status(500).send('Server Error');
  }  
});

router.post('/verify-pin', async (req, res) => {
  try {
      const { email, pin } = req.body;

      // Find the corresponding ForgetPassword document
      const forgetPasswordData = await ForgetPassword.findOne({ email, pin });

      if (!forgetPasswordData) {
          return res.status(400).json({ error: 'Invalid PIN or email' });
      }

      // Check if the PIN is not older than 1 minute
      const currentTimestamp = Date.now();
      const pinTimestamp = forgetPasswordData.createdAt.getTime();
      const timeDifference = currentTimestamp - pinTimestamp;
      const oneMinuteInMillis = 60 * 1000;

      if (timeDifference > oneMinuteInMillis) {
          return res.status(400).json({ error: 'Expired PIN. Request a new one.' });
      }

      // Delete the ForgetPassword document to ensure one-time use
      await ForgetPassword.deleteOne({ email, pin });

      res.json({ message: 'Valid pin enterd. Forget password record deleted. User can change the password',
                 status: 'SUCCESS'});
  } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Server Error' });
  }
});

// Endpoint to update user password
router.post('/update-password', async (req, res) => {
  try {
      const { email, newPassword } = req.body;

      // Find the user by email
      const user = await User.findOne({ email });

      if (!user) {
          return res.status(404).json({ error: 'User not found' });
      }

      // Update the user's password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      user.password = hashedPassword;
      await user.save();

      res.json({ message: 'Password updated successfully' });
  } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Server Error' });
  }
});

module.exports = router;
