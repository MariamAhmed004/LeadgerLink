using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;
using System.Threading.Tasks;
using LeadgerLink.Server.Models;
using LeadgerLink.Server.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace LeadgerLink.Server.Repositories.Implementations
{
    public class Repository<T> : IRepository<T> where T : class
    {
        private readonly LedgerLinkDbContext _context;
        private readonly DbSet<T> _dbSet;

        // ctor - require DbContext
        public Repository(LedgerLinkDbContext context)
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));
            _dbSet = _context.Set<T>();
        }

        // add entity
        public async Task<T> AddAsync(T entity)
        {
            if (entity == null) throw new ArgumentNullException(nameof(entity));
            await _dbSet.AddAsync(entity);
            await _context.SaveChangesAsync();
            return entity;
        }

        // count matching entities
        public async Task<int> CountAsync(Expression<Func<T, bool>> predicate)
        {
            if (predicate == null) throw new ArgumentNullException(nameof(predicate));
            return await _dbSet.CountAsync(predicate);
        }

        // delete entity
        public async Task Delete(T entity)
        {
            if (entity == null) throw new ArgumentNullException(nameof(entity));
            _dbSet.Remove(entity);
            await _context.SaveChangesAsync();
        }

        // check existence
        public async Task<bool> ExistsAsync(Expression<Func<T, bool>> predicate)
        {
            if (predicate == null) throw new ArgumentNullException(nameof(predicate));
            return await _dbSet.AnyAsync(predicate);
        }

        // get all
        public async Task<IEnumerable<T>> GetAllAsync()
        {
            return await _dbSet.ToListAsync();
        }

        // get by id (assumes single int key)
        public async Task<T> GetByIdAsync(int id)
        {
            return await _dbSet.FindAsync(id);
        }

        // first or default by predicate
        public async Task<T> GetFirstOrDefaultAsync(Expression<Func<T, bool>> predicate)
        {
            if (predicate == null) throw new ArgumentNullException(nameof(predicate));
            return await _dbSet.FirstOrDefaultAsync(predicate);
        }

        // where predicate
        public async Task<IEnumerable<T>> GetWhereAsync(Expression<Func<T, bool>> predicate)
        {
            if (predicate == null) throw new ArgumentNullException(nameof(predicate));
            return await _dbSet.Where(predicate).ToListAsync();
        }

        // update entity
        public async Task UpdateAsync(T entity)
        {
            if (entity == null) throw new ArgumentNullException(nameof(entity));
            _dbSet.Update(entity);
            await _context.SaveChangesAsync();
        }


        public async Task SaveChangesAsync() // Ensure this calls the overridden method
        {
            await _context.SaveChangesAsync();
        }
    }
}