const { AuthService } = require('./services/auth.service');
// Simple mock for testing
async function testLogin() {
    console.log("Testing login for st1@gmail.com...");
    const result = await AuthService.login('st1@gmail.com', 'st1@gmail.com');
    if (result.success) {
        console.log("Login successful!", result.user.fullName);
        console.log("Student Data:", result.user);
    } else {
        console.log("Login failed:", result.error);
    }
}
testLogin();
