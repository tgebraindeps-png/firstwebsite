using Microsoft.EntityFrameworkCore;
using ARGKGym.Models;

namespace ARGKGym.Data
{
    public class DatabaseContext : DbContext
    {
        public DatabaseContext(DbContextOptions<DatabaseContext> options)
            : base(options)
        {
        }

        public DbSet<User> Users { get; set; }
        public DbSet<Trainer> Trainers { get; set; }
        public DbSet<Order> Orders { get; set; }
        public DbSet<SupportRequest> SupportRequests { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Настройки для таблиц
            modelBuilder.Entity<User>(entity =>
            {
                entity.HasIndex(e => e.Email).IsUnique();
                entity.Property(e => e.Role).HasDefaultValue("user");
            });

            modelBuilder.Entity<Order>(entity =>
            {
                entity.Property(e => e.Id).ValueGeneratedNever();
            });

            modelBuilder.Entity<SupportRequest>(entity =>
            {
                entity.Property(e => e.Id).ValueGeneratedNever();
            });
        }
    }
}