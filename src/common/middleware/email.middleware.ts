import nodemailer from "nodemailer";

// export async function sendEmailOtp(
//   to: string,
//   otp: string,
// ): Promise<void> {
//   const transporter = nodemailer.createTransport({
//     service: 'gmail',
//     auth: {
//       user: process.env.MAIL_USER,
//       pass: process.env.MAIL_PASS,
//     },
//   });

//   await transporter.sendMail({
//     from: process.env.MAIL_USER,
//     to,
//     subject: 'Your OTP Code',
//     html: `
//       <div style="font-family: Arial;">
//         <h2>Your OTP is: ${otp}</h2>
//       </div>
//     `,
//   });
// }

export async function sendEmailOtp(
  to: string,
  otp: string,
): Promise<void> {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: `"Skill-Forge.AI" <${process.env.MAIL_USER}>`,
    to,
    subject: 'Your Verification OTP 🔐',
    html: `
      <div style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 30px;">
        <div style="
          max-width: 600px;
          margin: auto;
          background: #ffffff;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        ">

          <!-- Header -->
          <div style="
            background: #111827;
            padding: 24px;
            text-align: center;
          ">
            <h1 style="
              color: #ffffff;
              margin: 0;
              font-size: 28px;
            ">
              Skill-Forge.AI 🔐
            </h1>
          </div>

          <!-- Body -->
          <div style="padding: 40px 30px; color: #333333;">

            <h2 style="
              margin-top: 0;
              font-size: 24px;
              color: #111827;
            ">
              Verification Code
            </h2>

            <p style="
              font-size: 16px;
              line-height: 1.7;
              margin-bottom: 25px;
            ">
              Use the following OTP to verify your account.
            </p>

            <!-- OTP BOX -->
            <div style="
              background: #f9fafb;
              border: 2px dashed #111827;
              border-radius: 10px;
              padding: 20px;
              text-align: center;
              margin: 30px 0;
            ">
              <span style="
                font-size: 36px;
                font-weight: bold;
                letter-spacing: 8px;
                color: #111827;
              ">
                ${otp}
              </span>
            </div>

            <p style="
              font-size: 15px;
              color: #555555;
              line-height: 1.6;
            ">
              This OTP is valid for <strong>5 minutes</strong>.
              Please do not share this code with anyone.
            </p>

            <div style="
              margin-top: 35px;
              padding: 15px;
              background: #fef3c7;
              border-radius: 8px;
              color: #92400e;
              font-size: 14px;
            ">
              If you did not request this verification code,
              please ignore this email.
            </div>
          </div>

          <!-- Footer -->
          <div style="
            background: #f3f4f6;
            padding: 18px;
            text-align: center;
            font-size: 13px;
            color: #666666;
          ">
            © ${new Date().getFullYear()} Skill-Forge.AI.
            All rights reserved.
          </div>
        </div>
      </div>
    `,
  });
}

export async function sendWelcomeMessage(
  to: string,
  name: string,
  role: string,
): Promise<void> {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: `"Skill-Forge.AI" <${process.env.MAIL_USER}>`,
    to,
    subject: 'Welcome to Skill-Forge.AI 🚀',
    html: `
      <div style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 30px;">
        <div style="max-width: 600px; margin: auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          
          <div style="background: #111827; padding: 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0;">
              Welcome to Skill-Forge.AI 🚀
            </h1>
          </div>

          <div style="padding: 30px; color: #333;">
            <h2 style="margin-top: 0;">
              Hi ${name},
            </h2>

            <p style="font-size: 16px; line-height: 1.6;">
              Your account has been successfully created.
            </p>

            <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; font-size: 15px;">
                <strong>Role:</strong> ${role}
              </p>
            </div>

            <p style="font-size: 16px; line-height: 1.6;">
              We’re excited to have you onboard. Start exploring Skill-Forge.AI and unlock powerful features designed for your growth.
            </p>

            <div style="text-align: center; margin: 30px 0;">
              <a 
                href="http://localhost:5173"
                style="
                  background: #111827;
                  color: #ffffff;
                  padding: 12px 24px;
                  text-decoration: none;
                  border-radius: 6px;
                  display: inline-block;
                  font-weight: bold;
                "
              >
                Get Started
              </a>
            </div>

            <p style="font-size: 14px; color: #666;">
              If you did not create this account, please ignore this email.
            </p>
          </div>

          <div style="background: #f3f4f6; padding: 15px; text-align: center; font-size: 13px; color: #666;">
            © ${new Date().getFullYear()} Skill-Forge.AI. All rights reserved.
          </div>
        </div>
      </div>
    `,
  });
}