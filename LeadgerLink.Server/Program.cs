using LeadgerLink.Server.Identity;
using LeadgerLink.Server.Models;
using LeadgerLink.Server.Repositories.Implementations;
using LeadgerLink.Server.Repositories.Interfaces;
using LeadgerLink.Server.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using System.Text.Json.Serialization;
using DotNetEnv;

namespace LeadgerLink.Server
{
    public class Program
    {
        public static async Task Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);

            // Load environment variables from .env file (only in development)
            if (builder.Environment.IsDevelopment())
            {
                DotNetEnv.Env.Load();
                builder.Configuration.AddEnvironmentVariables();
                Console.WriteLine($"Loaded GEMINI_API_KEY: {Environment.GetEnvironmentVariable("GEMINI_API_KEY")}");
            }

            // Log all configuration keys and values (for debugging)
            Console.WriteLine("Configuration values:");
            foreach (var key in builder.Configuration.AsEnumerable())
            {
                Console.WriteLine($"Key: {key.Key}, Value: {key.Value}");
            }

            // Add services to the container.
            // 1) Your scaffolded DB context
            builder.Services.AddDbContext<LedgerLinkDbContext>(options =>
                options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

            // 2) Add Identity DB context (separate)
            builder.Services.AddDbContext<IdentityContext>(options =>
                options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

            // Register generic repository so IRepository<T> can be resolved (required by controllers that inject IRepository<SomeModel>)
            builder.Services.AddScoped(typeof(IRepository<>), typeof(Repository<>));

            // register repositories
            builder.Services.AddScoped<IOrganizationRepository, OrganizationRepository>();
            builder.Services.AddScoped<IStoreRepository, StoreRepository>();
            builder.Services.AddScoped<IUserRepository, UserRepository>();
            builder.Services.AddScoped<ISaleRepository, SaleRepository>();
            builder.Services.AddScoped<IInventoryItemRepository, InventoryItemRepository>();
            builder.Services.AddScoped<IInventoryTransferRepository, InventoryTransferRepository>();
            builder.Services.AddScoped<IRecipeRepository, RecipeRepository>();
            builder.Services.AddScoped<IReportRepository, ReportRepository>();
            builder.Services.AddScoped<IProductRepository, ProductRepository>();
            builder.Services.AddScoped<INotificationRepository, NotificationRepository>();
            builder.Services.AddScoped<IAuditLogRepository, AuditLogRepository>();


            // 3) Add Identity
            builder.Services.AddIdentity<ApplicationUser, IdentityRole>()
                .AddEntityFrameworkStores<IdentityContext>()
                .AddDefaultTokenProviders();

            // 4) Cookies for React
            builder.Services.ConfigureApplicationCookie(options =>
            {
                options.Cookie.HttpOnly = true;
                options.Cookie.SameSite = SameSiteMode.None;
                options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
                options.LoginPath = "/api/auth/unauthorized";
            });


            // Configure controllers + global JSON options to avoid object cycles during serialization.
            // Using ReferenceHandler.IgnoreCycles prevents the JsonSerializer from throwing on navigation cycles.
            builder.Services.AddControllers()
                .AddJsonOptions(opts =>
                {
                    opts.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
                    // optional: increase depth if you expect deeper graphs
                    opts.JsonSerializerOptions.MaxDepth = 64;
                    // optional: do not emit nulls if you prefer
                    // opts.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
                });

            // Learn more about configuring Swagger/OpenAPI
            builder.Services.AddEndpointsApiExplorer();
            builder.Services.AddSwaggerGen();

            // Allow React frontend (register the policy)
            builder.Services.AddCors(options =>
            {
                options.AddPolicy("AllowReactApp", policy =>
                    policy.WithOrigins("http://localhost:55070") //when published add the domain here
                          .AllowAnyHeader()
                          .AllowAnyMethod()
                          .AllowCredentials());
            });

            // Register IHttpContextAccessor for services needing HttpContext (e.g., AuditLogger)
            builder.Services.AddHttpContextAccessor();

            // Register Audit logger
            builder.Services.AddScoped<IAuditLogger, AuditLogger>();

            // Register Email service (MailKit SMTP)
            builder.Services.Configure<SmtpOptions>(builder.Configuration.GetSection("Smtp"));
            builder.Services.AddSingleton(sp => sp.GetRequiredService<Microsoft.Extensions.Options.IOptions<SmtpOptions>>().Value);
            builder.Services.AddSingleton<IEmailService, EmailService>();

            // Add HttpClient for GeminiChatService
            builder.Services.AddHttpClient<GeminiChatService>();

            var app = builder.Build();

            // Seed admin user
            await SeedAdminUser(app);
            await SeedTestUsers(app);

            app.UseDefaultFiles();
            app.UseStaticFiles();

            // Configure the HTTP request pipeline.
            if (app.Environment.IsDevelopment())
            {
                app.UseSwagger();
                app.UseSwaggerUI();
            }

            app.UseHttpsRedirection();

            app.UseCors("AllowReactApp");   // enable CORS 
            app.UseAuthentication();
            app.UseAuthorization();


            app.MapControllers();

            app.MapFallbackToFile("/index.html");

            app.Run();
        }

        // Seed method
        private static async Task SeedAdminUser(WebApplication app)
        {
            using var scope = app.Services.CreateScope();
            var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
            var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();

            
            // Ensure roles exist
            string[] roles = { "Application Admin", "Organization Admin", "Organization Accountant", "Store Manager", "Store Employee" };

            foreach (var roleName in roles)
            {
                if (!await roleManager.RoleExistsAsync(roleName))
                {
                    await roleManager.CreateAsync(new IdentityRole(roleName));
                    Console.WriteLine($"Role '{roleName}' created.");
                }
            }

            string applicationAdminRole = "Application Admin";

            // Check if admin exists
            string adminEmail = "admin@demo.com";
            string adminPassword = "Admin123!";

            if (await userManager.FindByEmailAsync(adminEmail) == null)
            {
                var adminUser = new ApplicationUser { UserName = adminEmail, Email = adminEmail };
                var result = await userManager.CreateAsync(adminUser, adminPassword);
                if (result.Succeeded)
                {
                    await userManager.AddToRoleAsync(adminUser, applicationAdminRole);
                    Console.WriteLine("Admin user created!");
                }
                else
                {
                    Console.WriteLine("Failed to create admin user:");
                    foreach (var error in result.Errors)
                        Console.WriteLine(error.Description);
                }
            }
        }

        private static async Task SeedTestUsers(WebApplication app)
        {
            using var scope = app.Services.CreateScope();
            var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
            var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();

            // Roles to ensure exist (excluding Application Admin since you already seeded it)
            string[] roles = { "Organization Admin", "Organization Accountant", "Store Manager", "Store Employee" };

            foreach (var roleName in roles)
            {
                if (!await roleManager.RoleExistsAsync(roleName))
                {
                    await roleManager.CreateAsync(new IdentityRole(roleName));
                    Console.WriteLine($"Role '{roleName}' created.");
                }
            }

            // Seed Organization Admin
            await CreateUserWithRole(userManager, "orgadmin@demo.com", "OrgAdmin123!", "Organization Admin");

            // Seed Organization Accountant
            await CreateUserWithRole(userManager, "orgaccountant@demo.com", "OrgAccountant123!", "Organization Accountant");

            // Seed Store Manager
            await CreateUserWithRole(userManager, "storemanager@demo.com", "StoreManager123!", "Store Manager");

            // Seed Store Employee
            await CreateUserWithRole(userManager, "storeemployee@demo.com", "StoreEmployee123!", "Store Employee");
        }

        private static async Task CreateUserWithRole(UserManager<ApplicationUser> userManager, string email, string password, string role)
        {
            if (await userManager.FindByEmailAsync(email) == null)
            {
                var user = new ApplicationUser { UserName = email, Email = email };
                var result = await userManager.CreateAsync(user, password);
                if (result.Succeeded)
                {
                    await userManager.AddToRoleAsync(user, role);
                    Console.WriteLine($"{role} user created: {email}");
                }
                else
                {
                    Console.WriteLine($"Failed to create {role} user:");
                    foreach (var error in result.Errors)
                        Console.WriteLine(error.Description);
                }
            }
        }

    }
}
