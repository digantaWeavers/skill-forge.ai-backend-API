import axios from "axios";

export async function sendSmsOtp(
  phone: string,
  otp: string,
): Promise<void> {
  try {
    const response = await axios.get('https://2factor.in/API/R1/', {
      params: {
        module: 'SMS_OTP',
        apikey: process.env.TWO_FACTOR_API_KEY,
        to: phone,
        otpvalue: otp,
        template_name: 'PhoneVerification',
      },
    });

    console.log(response.data);
  } catch (error: any) {
    console.log(error);
    throw error;
  }
}