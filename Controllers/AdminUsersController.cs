using System.Linq;
using InvestindoEmNegocio.Application.DTOs;
using InvestindoEmNegocio.Domain.Enums;
using InvestindoEmNegocio.Domain.Repositories;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InvestindoEmNegocio.Controllers;

[ApiController]
[Route("api/admin/users")]
[Route("api/v1/admin/users")]
[Authorize(Roles = "Admin")]
public class AdminUsersController(IUserRepository userRepository) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List(CancellationToken cancellationToken)
    {
        var users = await userRepository.ListAsync(cancellationToken);
        var response = users
            .Select(user => new UserSummaryResponse(
                user.Id,
                user.Name,
                user.Email,
                user.Role.ToString(),
                user.IsActive,
                user.CreatedAt))
            .ToList();

        return Ok(response);
    }

    [HttpPut("{id:guid}/role")]
    public async Task<IActionResult> UpdateRole(Guid id, [FromBody] UpdateUserRoleRequest request, CancellationToken cancellationToken)
    {
        if (request is null || string.IsNullOrWhiteSpace(request.Role))
        {
            return BadRequest(new ProblemDetails
            {
                Title = "Role inválida",
                Detail = "Informe uma role válida.",
                Status = StatusCodes.Status400BadRequest
            });
        }

        if (!Enum.TryParse<UserRole>(request.Role, true, out var parsedRole))
        {
            return BadRequest(new ProblemDetails
            {
                Title = "Role inválida",
                Detail = $"Role '{request.Role}' não reconhecida.",
                Status = StatusCodes.Status400BadRequest
            });
        }

        var user = await userRepository.GetByIdAsync(id, cancellationToken);
        if (user is null)
        {
            return NotFound();
        }

        user.SetRole(parsedRole);
        await userRepository.SaveChangesAsync(cancellationToken);

        return Ok(new UserSummaryResponse(
            user.Id,
            user.Name,
            user.Email,
            user.Role.ToString(),
            user.IsActive,
            user.CreatedAt));
    }
}
