/**
 * Generic repository contract for base CRUD operations.
 */
interface IRepository<T> {
  findById(id: string): Promise<T | null>;
  create(data: Partial<T>): Promise<T | null>;
  update(id: string, data: Partial<T>): Promise<boolean>;
  delete(id: string): Promise<boolean>;
}

export default IRepository;
