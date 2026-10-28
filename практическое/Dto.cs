using System.ComponentModel.DataAnnotations;

namespace ARGKGym.DTOs
{
    public class LoginRequest
    {
        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required]
        public string Password { get; set; } = string.Empty;
    }

    public class RegisterRequest
    {
        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required]
        [MinLength(4)]
        public string Password { get; set; } = string.Empty;

        [Required]
        [Phone]
        public string Phone { get; set; } = string.Empty;
    }

    public class UpdateProfileRequest
    {
        [Required]
        public int Id { get; set; }

        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        [Required]
        [Phone]
        public string Phone { get; set; } = string.Empty;

        [EmailAddress]
        public string? Email { get; set; }

        [MinLength(4)]
        public string? Password { get; set; }
    }

    public class CreateOrderRequest
    {
        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        [Required]
        [Phone]
        public string Phone { get; set; } = string.Empty;

        [Required]
        [MaxLength(500)]
        public string ServiceTrainer { get; set; } = string.Empty;

        [Required]
        public string Date { get; set; } = string.Empty;
    }

    public class CreateSupportRequest
    {
        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        [Required]
        [Phone]
        public string Phone { get; set; } = string.Empty;

        public string? Time { get; set; }
        public string? Question { get; set; }
    }

    public class AuthResponse
    {
        public UserDto? User { get; set; }
        public string Token { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
    }

    public class UserDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
    }

    public class ApiResponse<T>
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public T? Data { get; set; }
        public List<string> Errors { get; set; } = new();
    }
}