namespace LeadgerLink.Server.Dtos.UserDtos
{
    public class RequestPasswordResetDto
    {
        public string Email { get; set; } // The user's email address
    }


    public class ResetPasswordDto
    {
        public string Email { get; set; } // The user's email address
        public string Token { get; set; } // The password reset token
        public string NewPassword { get; set; } // The new password
    }

}
