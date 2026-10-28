using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ARGKGym.Models
{
    // ==================== ПОЛЬЗОВАТЕЛИ ====================
    [Table("Users")]
    public class User
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        public string Email { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        public string Password { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string Phone { get; set; } = string.Empty;

        [Required]
        [MaxLength(20)]
        public string Role { get; set; } = "user";
    }

    // ==================== ТРЕНЕРЫ ====================
    [Table("Trainers")]
    public class Trainer
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        public string Spec { get; set; } = string.Empty;

        [Required]
        [MaxLength(500)]
        public string Photo { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string Experience { get; set; } = string.Empty;

        [Required]
        [MaxLength(500)]
        public string Achievements { get; set; } = string.Empty;

        [Required]
        [MaxLength(1000)]
        public string Description { get; set; } = string.Empty;
    }

    // ==================== ЗАКАЗЫ ====================
    [Table("Orders")]
    public class Order
    {
        [Key]
        public long Id { get; set; }

        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string Phone { get; set; } = string.Empty;

        [Required]
        [MaxLength(500)]
        public string ServiceTrainer { get; set; } = string.Empty;

        [Required]
        [MaxLength(10)]
        public string Date { get; set; } = string.Empty;
    }

    // ==================== ЗАЯВКИ ====================
    [Table("SupportRequests")]
    public class SupportRequest
    {
        [Key]
        public long Id { get; set; }

        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string Phone { get; set; } = string.Empty;

        [MaxLength(100)]
        public string? Time { get; set; }

        [MaxLength(1000)]
        public string? Question { get; set; }

        [Required]
        [MaxLength(10)]
        public string Date { get; set; } = string.Empty;
    }
}