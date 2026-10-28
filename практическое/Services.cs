using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using ARGKGym.Data;
using ARGKGym.Models;
using ARGKGym.DTOs;

namespace ARGKGym.Services
{
    // ============================================
    // 1. ИНТЕРФЕЙСЫ СЕРВИСОВ
    // ============================================

    public interface IAuthService
    {
        Task<ApiResponse<AuthResponse>> RegisterAsync(RegisterRequest request);
        Task<ApiResponse<AuthResponse>> LoginAsync(LoginRequest request);
        Task<ApiResponse<UserDto>> UpdateProfileAsync(UpdateProfileRequest request);
    }

    public interface IOrderService
    {
        Task<ApiResponse<List<Order>>> GetOrdersAsync();
        Task<ApiResponse<Order>> CreateOrderAsync(CreateOrderRequest request);
        Task<ApiResponse<bool>> DeleteOrderAsync(long id);
        Task<ApiResponse<bool>> ClearAllOrdersAsync();
    }

    public interface ISupportService
    {
        Task<ApiResponse<List<SupportRequest>>> GetRequestsAsync();
        Task<ApiResponse<SupportRequest>> CreateRequestAsync(CreateSupportRequest request);
        Task<ApiResponse<bool>> ClearAllRequestsAsync();
    }

    public interface ITrainerService
    {
        Task<ApiResponse<List<Trainer>>> GetTrainersAsync();
    }

    // ============================================
    // 2. СЕРВИС АВТОРИЗАЦИИ
    // ============================================

    public class AuthService : IAuthService
    {
        private readonly DatabaseContext _context;
        private readonly IConfiguration _configuration;
        private readonly ILogger<AuthService> _logger;

        public AuthService(DatabaseContext context, IConfiguration configuration, ILogger<AuthService> logger)
        {
            _context = context;
            _configuration = configuration;
            _logger = logger;
        }

        public async Task<ApiResponse<AuthResponse>> RegisterAsync(RegisterRequest request)
        {
            try
            {
                if (await _context.Users.AnyAsync(u => u.Email == request.Email))
                {
                    return new ApiResponse<AuthResponse>
                    {
                        Success = false,
                        Message = "Email уже зарегистрирован"
                    };
                }

                var hashedPassword = BCrypt.Net.BCrypt.HashPassword(request.Password);

                var user = new User
                {
                    Name = request.Name,
                    Email = request.Email,
                    Password = hashedPassword,
                    Phone = request.Phone,
                    Role = "user"
                };

                _context.Users.Add(user);
                await _context.SaveChangesAsync();

                return new ApiResponse<AuthResponse>
                {
                    Success = true,
                    Message = "Регистрация успешна"
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Ошибка регистрации");
                return new ApiResponse<AuthResponse>
                {
                    Success = false,
                    Message = "Ошибка регистрации"
                };
            }
        }

        public async Task<ApiResponse<AuthResponse>> LoginAsync(LoginRequest request)
        {
            try
            {
                var user = await _context.Users
                    .FirstOrDefaultAsync(u => u.Email == request.Email);

                if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.Password))
                {
                    return new ApiResponse<AuthResponse>
                    {
                        Success = false,
                        Message = "Неверный email или пароль"
                    };
                }

                var token = GenerateJwtToken(user);

                return new ApiResponse<AuthResponse>
                {
                    Success = true,
                    Message = "Вход выполнен",
                    Data = new AuthResponse
                    {
                        User = new UserDto
                        {
                            Id = user.Id,
                            Name = user.Name,
                            Email = user.Email,
                            Phone = user.Phone,
                            Role = user.Role
                        },
                        Token = token,
                        Message = "Вход выполнен"
                    }
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Ошибка входа");
                return new ApiResponse<AuthResponse>
                {
                    Success = false,
                    Message = "Ошибка входа"
                };
            }
        }

        public async Task<ApiResponse<UserDto>> UpdateProfileAsync(UpdateProfileRequest request)
        {
            try
            {
                var user = await _context.Users.FindAsync(request.Id);
                if (user == null)
                {
                    return new ApiResponse<UserDto>
                    {
                        Success = false,
                        Message = "Пользователь не найден"
                    };
                }

                user.Name = request.Name;
                user.Phone = request.Phone;

                if (!string.IsNullOrEmpty(request.Email) && request.Email != user.Email)
                {
                    if (await _context.Users.AnyAsync(u => u.Email == request.Email && u.Id != request.Id))
                    {
                        return new ApiResponse<UserDto>
                        {
                            Success = false,
                            Message = "Email уже используется"
                        };
                    }
                    user.Email = request.Email;
                }

                if (!string.IsNullOrEmpty(request.Password))
                {
                    user.Password = BCrypt.Net.BCrypt.HashPassword(request.Password);
                }

                await _context.SaveChangesAsync();

                return new ApiResponse<UserDto>
                {
                    Success = true,
                    Message = "Профиль обновлен",
                    Data = new UserDto
                    {
                        Id = user.Id,
                        Name = user.Name,
                        Email = user.Email,
                        Phone = user.Phone,
                        Role = user.Role
                    }
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Ошибка обновления профиля");
                return new ApiResponse<UserDto>
                {
                    Success = false,
                    Message = "Ошибка обновления"
                };
            }
        }

        private string GenerateJwtToken(User user)
        {
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["Jwt:Key"] ?? "YourSuperSecretKeyAtLeast32Chars!"));
            var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Email, user.Email),
                new Claim(ClaimTypes.Name, user.Name),
                new Claim(ClaimTypes.Role, user.Role)
            };

            var token = new JwtSecurityToken(
                issuer: _configuration["Jwt:Issuer"],
                audience: _configuration["Jwt:Audience"],
                claims: claims,
                expires: DateTime.Now.AddDays(7),
                signingCredentials: credentials
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }

    // ============================================
    // 3. СЕРВИС ЗАКАЗОВ
    // ============================================

    public class OrderService : IOrderService
    {
        private readonly DatabaseContext _context;
        private readonly ILogger<OrderService> _logger;

        public OrderService(DatabaseContext context, ILogger<OrderService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<ApiResponse<List<Order>>> GetOrdersAsync()
        {
            try
            {
                var orders = await _context.Orders
                    .OrderByDescending(o => o.Date)
                    .ToListAsync();

                return new ApiResponse<List<Order>>
                {
                    Success = true,
                    Data = orders
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Ошибка получения заказов");
                return new ApiResponse<List<Order>>
                {
                    Success = false,
                    Message = "Ошибка получения заказов"
                };
            }
        }

        public async Task<ApiResponse<Order>> CreateOrderAsync(CreateOrderRequest request)
        {
            try
            {
                var order = new Order
                {
                    Id = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
                    Name = request.Name,
                    Phone = request.Phone,
                    ServiceTrainer = request.ServiceTrainer,
                    Date = request.Date
                };

                _context.Orders.Add(order);
                await _context.SaveChangesAsync();

                return new ApiResponse<Order>
                {
                    Success = true,
                    Message = "Заказ создан",
                    Data = order
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Ошибка создания заказа");
                return new ApiResponse<Order>
                {
                    Success = false,
                    Message = "Ошибка создания заказа"
                };
            }
        }

        public async Task<ApiResponse<bool>> DeleteOrderAsync(long id)
        {
            try
            {
                var order = await _context.Orders.FindAsync(id);
                if (order == null)
                {
                    return new ApiResponse<bool>
                    {
                        Success = false,
                        Message = "Заказ не найден"
                    };
                }

                _context.Orders.Remove(order);
                await _context.SaveChangesAsync();

                return new ApiResponse<bool>
                {
                    Success = true,
                    Message = "Заказ удален",
                    Data = true
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Ошибка удаления заказа");
                return new ApiResponse<bool>
                {
                    Success = false,
                    Message = "Ошибка удаления"
                };
            }
        }

        public async Task<ApiResponse<bool>> ClearAllOrdersAsync()
        {
            try
            {
                _context.Orders.RemoveRange(_context.Orders);
                await _context.SaveChangesAsync();

                return new ApiResponse<bool>
                {
                    Success = true,
                    Message = "Все заказы удалены",
                    Data = true
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Ошибка очистки заказов");
                return new ApiResponse<bool>
                {
                    Success = false,
                    Message = "Ошибка очистки"
                };
            }
        }
    }

    // ============================================
    // 4. СЕРВИС ЗАЯВОК
    // ============================================

    public class SupportService : ISupportService
    {
        private readonly DatabaseContext _context;
        private readonly ILogger<SupportService> _logger;

        public SupportService(DatabaseContext context, ILogger<SupportService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<ApiResponse<List<SupportRequest>>> GetRequestsAsync()
        {
            try
            {
                var requests = await _context.SupportRequests
                    .OrderByDescending(r => r.Date)
                    .ToListAsync();

                return new ApiResponse<List<SupportRequest>>
                {
                    Success = true,
                    Data = requests
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Ошибка получения заявок");
                return new ApiResponse<List<SupportRequest>>
                {
                    Success = false,
                    Message = "Ошибка получения заявок"
                };
            }
        }

        public async Task<ApiResponse<SupportRequest>> CreateRequestAsync(CreateSupportRequest request)
        {
            try
            {
                var supportRequest = new SupportRequest
                {
                    Id = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
                    Name = request.Name,
                    Phone = request.Phone,
                    Time = request.Time,
                    Question = request.Question,
                    Date = DateTime.Now.ToString("yyyy-MM-dd")
                };

                _context.SupportRequests.Add(supportRequest);
                await _context.SaveChangesAsync();

                return new ApiResponse<SupportRequest>
                {
                    Success = true,
                    Message = "Заявка отправлена",
                    Data = supportRequest
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Ошибка создания заявки");
                return new ApiResponse<SupportRequest>
                {
                    Success = false,
                    Message = "Ошибка отправки заявки"
                };
            }
        }

        public async Task<ApiResponse<bool>> ClearAllRequestsAsync()
        {
            try
            {
                _context.SupportRequests.RemoveRange(_context.SupportRequests);
                await _context.SaveChangesAsync();

                return new ApiResponse<bool>
                {
                    Success = true,
                    Message = "Все заявки удалены",
                    Data = true
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Ошибка очистки заявок");
                return new ApiResponse<bool>
                {
                    Success = false,
                    Message = "Ошибка очистки"
                };
            }
        }
    }

    // ============================================
    // 5. СЕРВИС ТРЕНЕРОВ
    // ============================================

    public class TrainerService : ITrainerService
    {
        private readonly DatabaseContext _context;
        private readonly ILogger<TrainerService> _logger;

        public TrainerService(DatabaseContext context, ILogger<TrainerService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<ApiResponse<List<Trainer>>> GetTrainersAsync()
        {
            try
            {
                var trainers = await _context.Trainers
                    .OrderBy(t => t.Id)
                    .ToListAsync();

                return new ApiResponse<List<Trainer>>
                {
                    Success = true,
                    Data = trainers
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Ошибка получения тренеров");
                return new ApiResponse<List<Trainer>>
                {
                    Success = false,
                    Message = "Ошибка получения тренеров"
                };
            }
        }
    }
}