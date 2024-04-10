const readline = require("readline");

const email = "buitrithuc1506@gmail.com";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const sendOTP = async (email) => {
  const totp = await fetch("http://localhost:3000/api/auth/send-otp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email }),
  });
  const response = await totp.json();
  console.log("response: ", response.totp);
  return response.totp;
};

const verifyOTP = async (totp, otp) => {
  console.log(totp);
  console.log(otp);

  if (otp === totp.otp && totp.expires >= Date.now()) {
    console.log("OTP verified successfully");
    return true;
  } else {
    console.log("OTP verification failed");
    return false;
  }
};

const testOTP = async () => {
  const totp = await sendOTP(email);
    rl.question("Enter OTP: ", async (otp) => {
      rs = await verifyOTP(totp, otp);
      rl.close();
    });
};

testOTP();
