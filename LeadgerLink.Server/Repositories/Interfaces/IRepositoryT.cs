using System;
using System.Collections.Generic;
using System.Text;
using System.IO;
using System.Linq.Expressions;


namespace LeadgerLink.Server.Repositories.Interfaces
{
	public interface IRepository<T>
	{

		Task<T> AddAsync(T entity);


		Task<int> CountAsync(Expression<Func<T, bool>> predicate);


		Task Delete(T entity);


		Task<bool> ExistsAsync(Expression<Func<T, bool>> predicate);

		Task<IEnumerable<T>> GetAllAsync();


		Task<T> GetByIdAsync(int id);


		Task<T> GetFirstOrDefaultAsync(Expression<Func<T, bool>> predicate);


		Task<IEnumerable<T>> GetWhereAsync(Expression<Func<T, bool>> predicate);



		Task UpdateAsync(T entity);
        Task SaveChangesAsync();
    }
}