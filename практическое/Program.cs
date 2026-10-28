using ARGKGym.Data;
using ARGKGym.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// ============================================
// 1. НАСТРОЙКА КОНТРОЛЛЕРОВ
// ============================================
builder.Services.AddControllers();

// ============================================
// 2. НАСТРОЙКА SWAGGER (ДОКУМЕНТАЦИЯ API)
// ============================================
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "ARGK Gym API",
        Version = "v1",
        Description = "API для тренажерного зала ARGK Gym",
        Contact = new OpenApiContact
        {
            Name = "ARGK Gym",
            Email = "tgebraindeps@gmail.com"
        },
        License = new OpenApiLicense
        {
            Name = "MIT License",
            Url = new Uri("https://opensource.org/licenses/MIT")
        }
    });

    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Enter 'Bearer' [space] and then your token",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

// ============================================
// 3. НАСТРОЙКА CORS (ДЛЯ ДОСТУПА С ФРОНТЕНДА)
// ============================================
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

// ============================================
// 4. НАСТРОЙКА JWT АУТЕНТИФИКАЦИИ
// ============================================
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"] ?? "YourSuperSecretKeyAtLeast32Chars!"))
        };
    });

// ============================================
// 5. НАСТРОЙКА БАЗЫ ДАННЫХ (SQL Server)
// ============================================
builder.Services.AddDbContext<DatabaseContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// ============================================
// 6. РЕГИСТРАЦИЯ СЕРВИСОВ (Dependency Injection)
// ============================================
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IOrderService, OrderService>();
builder.Services.AddScoped<ISupportService, SupportService>();
builder.Services.AddScoped<ITrainerService, TrainerService>();

// ============================================
// 7. ПОСТРОЕНИЕ ПРИЛОЖЕНИЯ
// ============================================
var app = builder.Build();

// ============================================
// 8. НАСТРОЙКА HTTP PIPELINE
// ============================================

// Swagger - только в режиме разработки
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "ARGK Gym API v1");
        c.RoutePrefix = "swagger";
        c.DocExpansion(Swashbuckle.AspNetCore.SwaggerUI.DocExpansion.None);
    });
}

// Перенаправление на HTTPS
app.UseHttpsRedirection();

// Поддержка статических файлов (HTML, CSS, JS)
app.UseStaticFiles();

// ⭐⭐⭐ УДАЛЕН дублирующийся app.MapGet("/", ...) ⭐⭐⭐

// CORS - должен быть ДО UseAuthentication и UseAuthorization
app.UseCors("AllowAll");

// Аутентификация и авторизация
app.UseAuthentication();
app.UseAuthorization();

// Маршрутизация контроллеров
app.MapControllers();

// ============================================
// 9. ЗАПУСК ПРИЛОЖЕНИЯ
// ============================================
app.Run();