using ARGKGym.DTOs;
using ARGKGym.Models;
using ARGKGym.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ARGKGym.Controllers
{
    // ============================================
    // 1. КОНТРОЛЛЕР АВТОРИЗАЦИИ
    // ============================================
    [ApiController]
    [Route("api/auth")]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;

        public AuthController(IAuthService authService)
        {
            _authService = authService;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterRequest request)
        {
            var result = await _authService.RegisterAsync(request);
            if (!result.Success)
                return BadRequest(result);
            return Ok(result);
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            var result = await _authService.LoginAsync(request);
            if (!result.Success)
                return Unauthorized(result);
            return Ok(result);
        }

        [Authorize]
        [HttpPut("update")]
        public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileRequest request)
        {
            var result = await _authService.UpdateProfileAsync(request);
            if (!result.Success)
                return BadRequest(result);
            return Ok(result);
        }

        [Authorize(Roles = "admin")]
        [HttpGet("users")]
        public async Task<IActionResult> GetAllUsers()
        {
            return Ok(new { message = "Список пользователей" });
        }
    }

    // ============================================
    // 2. КОНТРОЛЛЕР ЗАКАЗОВ
    // ============================================
    [ApiController]
    [Route("api/orders")]
    public class OrdersController : ControllerBase
    {
        private readonly IOrderService _orderService;

        public OrdersController(IOrderService orderService)
        {
            _orderService = orderService;
        }

        [Authorize(Roles = "admin")]
        [HttpGet]
        public async Task<IActionResult> GetOrders()
        {
            var result = await _orderService.GetOrdersAsync();
            if (!result.Success)
                return BadRequest(result);
            return Ok(result);
        }

        [HttpGet("my")]
        public async Task<IActionResult> GetMyOrders()
        {
            var result = await _orderService.GetOrdersAsync();
            if (!result.Success)
                return BadRequest(result);
            return Ok(result);
        }

        [HttpPost]
        public async Task<IActionResult> CreateOrder([FromBody] CreateOrderRequest request)
        {
            var result = await _orderService.CreateOrderAsync(request);
            if (!result.Success)
                return BadRequest(result);
            return Ok(result);
        }

        [Authorize(Roles = "admin")]
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteOrder(long id)
        {
            var result = await _orderService.DeleteOrderAsync(id);
            if (!result.Success)
                return BadRequest(result);
            return Ok(result);
        }

        [Authorize(Roles = "admin")]
        [HttpDelete("clear")]
        public async Task<IActionResult> ClearAllOrders()
        {
            var result = await _orderService.ClearAllOrdersAsync();
            if (!result.Success)
                return BadRequest(result);
            return Ok(result);
        }

        [Authorize(Roles = "admin")]
        [HttpGet("stats")]
        public async Task<IActionResult> GetOrdersStats()
        {
            var result = await _orderService.GetOrdersAsync();
            if (!result.Success)
                return BadRequest(result);

            var orders = result.Data;
            var total = orders?.Count ?? 0;
            var totalSum = orders?.Sum(o => {
                var price = 0;
                if (!string.IsNullOrEmpty(o.ServiceTrainer))
                {
                    var parts = o.ServiceTrainer.Split(',');
                    foreach (var p in parts)
                    {
                        var match = System.Text.RegularExpressions.Regex.Match(p, @"(\d+)\s*BYN");
                        if (match.Success)
                            price += int.Parse(match.Groups[1].Value);
                    }
                }
                return price;
            }) ?? 0;

            return Ok(new
            {
                totalOrders = total,
                totalSum = totalSum,
                average = total > 0 ? totalSum / total : 0
            });
        }
    }

    // ============================================
    // 3. КОНТРОЛЛЕР ЗАЯВОК
    // ============================================
    [ApiController]
    [Route("api/support")]
    public class SupportController : ControllerBase
    {
        private readonly ISupportService _supportService;

        public SupportController(ISupportService supportService)
        {
            _supportService = supportService;
        }

        [Authorize(Roles = "admin")]
        [HttpGet]
        public async Task<IActionResult> GetRequests()
        {
            var result = await _supportService.GetRequestsAsync();
            if (!result.Success)
                return BadRequest(result);
            return Ok(result);
        }

        [HttpPost]
        public async Task<IActionResult> CreateRequest([FromBody] CreateSupportRequest request)
        {
            var result = await _supportService.CreateRequestAsync(request);
            if (!result.Success)
                return BadRequest(result);
            return Ok(result);
        }

        [Authorize(Roles = "admin")]
        [HttpDelete("clear")]
        public async Task<IActionResult> ClearAllRequests()
        {
            var result = await _supportService.ClearAllRequestsAsync();
            if (!result.Success)
                return BadRequest(result);
            return Ok(result);
        }

        [Authorize(Roles = "admin")]
        [HttpPut("{id}/status")]
        public async Task<IActionResult> UpdateRequestStatus(long id, [FromBody] string status)
        {
            return Ok(new { message = $"Статус заявки {id} обновлен на {status}" });
        }
    }

    // ============================================
    // 4. КОНТРОЛЛЕР ТРЕНЕРОВ
    // ============================================
    [ApiController]
    [Route("api/trainers")]
    public class TrainersController : ControllerBase
    {
        private readonly ITrainerService _trainerService;

        public TrainersController(ITrainerService trainerService)
        {
            _trainerService = trainerService;
        }

        [HttpGet]
        public async Task<IActionResult> GetTrainers()
        {
            var result = await _trainerService.GetTrainersAsync();
            if (!result.Success)
                return BadRequest(result);
            return Ok(result);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetTrainerById(int id)
        {
            var result = await _trainerService.GetTrainersAsync();
            if (!result.Success)
                return BadRequest(result);

            var trainer = result.Data?.FirstOrDefault(t => t.Id == id);
            if (trainer == null)
                return NotFound(new { message = "Тренер не найден" });

            return Ok(trainer);
        }

        [Authorize(Roles = "admin")]
        [HttpPost]
        public async Task<IActionResult> CreateTrainer([FromBody] Trainer trainer)
        {
            return Ok(new { message = "Тренер создан", trainer });
        }

        [Authorize(Roles = "admin")]
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateTrainer(int id, [FromBody] Trainer trainer)
        {
            return Ok(new { message = $"Тренер {id} обновлен", trainer });
        }

        [Authorize(Roles = "admin")]
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteTrainer(int id)
        {
            return Ok(new { message = $"Тренер {id} удален" });
        }
    }

    // ============================================
    // 5. КОНТРОЛЛЕР ДЛЯ ГЛАВНОЙ СТРАНИЦЫ
    // ============================================
    [ApiController]
    [Route("")]
    public class HomeController : ControllerBase
    {
        [HttpGet]
        public IActionResult Index()
        {
            // ⭐⭐⭐ ПЕРЕНАПРАВЛЕНИЕ НА index.html ⭐⭐⭐
            return Redirect("/index.html");
        }
    }
}