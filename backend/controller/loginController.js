const pool = require('../database/index');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

const controller = {
  getAllUsers: async (req, res) => {
    try {
      const [rows] = await pool.query('SELECT * FROM user');
      res.status(200).json({ data: rows });
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: 'Internal server error' });
    }
  },
  login: async (req, res) => {
    try {
      const { user_email, user_password } = req.body;
      console.log(user_email, user_password);
      const [rows] = await pool.query(
        'SELECT * FROM user WHERE user_email = ?',
        user_email
      );
      const user = rows[0];

      if (!user) {
        return res.status(401).json({ message: 'Invalid username' });
      }

      if (user.user_password !== user_password) {
        return res.status(401).json({ message: 'Invalid password' });
      }

      // Generate a 4-digit MFA code
      const mfaCode = Math.floor(1000 + Math.random() * 9000).toString();
      await pool.query('UPDATE user SET mfa_code = ? WHERE user_id = ?', [
        mfaCode,
        user.user_id,
      ]);

      // Send MFA code to user's email
      await controller.sendMFAEmail(user.user_email, mfaCode);

      return res.status(200).json({
        requiresMFA: true,
        userId: user.user_id, // Send userId for MFA verification
      });
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: 'Internal server error' });
    }
  },
  verifyMFA: async (req, res) => {
    try {
      const { user_id, mfa_code } = req.body;
      const [rows] = await pool.query(
        'SELECT * FROM user WHERE user_id = ?',
        user_id
      );
      const user = rows[0];
      if (user.mfa_code != mfa_code) {
        return res.status(401).json({ message: 'MFA code is invalid.' });
      }

      // If valid, generate tokens
      const secret = jwt + user.user_password;
      const shortToken = jwt.sign({ user_id: user.user_id }, secret, {
        expiresIn: '5m',
      });
      const longToken = jwt.sign({ user_id: user.user_id }, secret);

      // Clear the MFA code after successful verification
      await pool.query(
        'UPDATE user SET mfa_code = NULL WHERE user_id = ?',
        user_id
      );

      return res.status(200).json({
        message: 'MFA verification successful',
        shortToken: shortToken,
        longToken: longToken,
      });
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: 'Internal server error' });
    }
  },
  sendMFAEmail: async (user_email, code) => {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USERNAME,
      to: user_email,
      subject: 'Your MFA Code',
      text: `Your MFA code is: ${code}`,
    };
    console.log(mailOptions);
    return transporter.sendMail(mailOptions);
  },
};

module.exports = controller;
