using LeadgerLink.Server.Contexts;
using LeadgerLink.Server.Identity;
using LeadgerLink.Server.Models;
using LeadgerLink.Server.Repositories.Implementations;
using LeadgerLink.Server.Repositories.Interfaces;
using LeadgerLink.Server.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using System.Text.Json.Serialization;

namespace LeadgerLink.Server
{
    public static class Program
    {
        public static async Task Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);

            // Add services to the container.

            // 1) Database contexts
            // Register the main application database context and the Identity database context for dependency injection.
            builder.Services.AddDbContext<LedgerLinkDbContext>(options =>
                options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));
            builder.Services.AddDbContext<IdentityContext>(options =>
                options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

            // 2) Identity configuration
            // Configure Identity for user authentication and authorization, including role management.
            builder.Services.AddIdentity<ApplicationUser, IdentityRole>()
                .AddEntityFrameworkStores<IdentityContext>()
                .AddDefaultTokenProviders();

            // 3) Repositories
            // Register the generic repository and all specific repositories for dependency injection.
            builder.Services.AddScoped(typeof(IRepository<>), typeof(Repository<>));
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

            // 4) Audit logging
            // Register the audit logger and audit context for tracking changes and user actions.
            builder.Services.AddScoped<IAuditLogger, AuditLogger>();
            builder.Services.AddScoped<IAuditContext, AuditContext>();

            // 5) Email service
            // Configure and register the email service for sending emails using MailKit SMTP.
            builder.Services.Configure<SmtpOptions>(builder.Configuration.GetSection("Smtp"));
            builder.Services.AddSingleton(sp => sp.GetRequiredService<Microsoft.Extensions.Options.IOptions<SmtpOptions>>().Value);
            builder.Services.AddSingleton<IEmailService, EmailService>();

            // 6) HTTP context accessor
            // Register IHttpContextAccessor to allow services to access the current HTTP context.
            builder.Services.AddHttpContextAccessor();

            // 7) Cookies for React
            // Configure cookie settings for authentication and session management in the React frontend.
            builder.Services.ConfigureApplicationCookie(options =>
            {
                options.Cookie.HttpOnly = true;
                options.Cookie.SameSite = SameSiteMode.None;
                options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
                options.LoginPath = "/api/auth/unauthorized";
            });

            // 8) Controllers and JSON options
            // Add controllers and configure JSON serialization options to handle object cycles and depth limits.
            builder.Services.AddControllers()
                .AddJsonOptions(opts =>
                {
                    opts.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
                    opts.JsonSerializerOptions.MaxDepth = 64;
                });

            // 9) CORS policy for React frontend
            // Allow cross-origin requests from the React frontend with specific headers and methods.
            builder.Services.AddCors(options =>
            {
                options.AddPolicy("AllowReactApp", policy =>
                    policy.WithOrigins("http://localhost:55070") //when published add the domain here
                          .AllowAnyHeader()
                          .AllowAnyMethod()
                          .AllowCredentials());
            });

            // 10) Swagger/OpenAPI
            // Add Swagger for API documentation and testing in development mode.
            builder.Services.AddEndpointsApiExplorer();
            builder.Services.AddSwaggerGen();

            var app = builder.Build();

            // Seed data
            // Seed the admin user and test users into the database.
            await SeedAdminUser(app);
            await SeedTestUsers(app);

            // Middleware configuration
            // Configure middleware for serving static files, enabling Swagger, and handling requests.
            app.UseDefaultFiles();
            app.UseStaticFiles();

            if (app.Environment.IsDevelopment())
            {
                app.UseSwagger();
                app.UseSwaggerUI();
            }

            app.UseHttpsRedirection();
            app.UseCors("AllowReactApp");   // enable CORS 
            app.UseAuthentication();
            app.UseAuthorization();

            // Map controllers and fallback
            // Map API controllers and fallback to the React frontend for unmatched routes.
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
