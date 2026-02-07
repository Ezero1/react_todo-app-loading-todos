/* eslint-disable jsx-a11y/label-has-associated-control */
/* eslint-disable jsx-a11y/control-has-associated-label */
import React, { useState, useEffect, useMemo } from 'react';
import classNames from 'classnames';
import { UserWarning } from './UserWarning';
import {
  USER_ID,
  getTodos,
  createTodo,
  updateTodo,
  deleteTodo,
} from './api/todos';
import { Todo } from './types/Todo';

export const App: React.FC = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [title, setTitle] = useState('');
  const [tempTodos, setTempTodos] = useState<number[]>([]);

  useEffect(() => {
    setLoading(true);
    getTodos()
      .then(setTodos)
      .catch(() => {
        setError('Unable to load todos');
        setTimeout(() => setError(null), 3000);
      })
      .finally(() => setLoading(false));
  }, []);

  const visibleTodos = useMemo(() => {
    return todos.filter(todo => {
      switch (filter) {
        case 'active':
          return !todo.completed;
        case 'completed':
          return todo.completed;
        default:
          return true;
      }
    });
  }, [todos, filter]);

  const toggleAll = () => {
    const activeTodos = todos.filter(todo => !todo.completed);
    const areAllCompleted = activeTodos.length === 0;
    const shouldBeCompleted = !areAllCompleted;

    // Оптимізація: оновлюємо тільки ті, що мають неправильний статус
    const todosToUpdate = todos.filter(
      todo => todo.completed !== shouldBeCompleted,
    );

    if (todosToUpdate.length === 0) {
      return;
    }

    setLoading(true);

    const promises = todosToUpdate.map(todo => {
      return updateTodo({ ...todo, completed: shouldBeCompleted });
    });

    Promise.all(promises)
      .then(() => {
        setTodos(currentTodos =>
          currentTodos.map(todo =>
            todo.completed !== shouldBeCompleted
              ? { ...todo, completed: shouldBeCompleted }
              : todo,
          ),
        );
      })
      .catch(() => {
        setError('Unable to update todos');
        setTimeout(() => setError(null), 3000);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim()) {
      setError('Title should not be empty');
      setTimeout(() => setError(null), 3000);

      return;
    }

    setLoading(true);
    createTodo({
      userId: USER_ID,
      title: title.trim(),
      completed: false,
    })
      .then(newTodo => {
        setTodos([...todos, newTodo]);
        setTitle('');
      })
      .catch(() => {
        setError('Unable to add a todo');
        setTimeout(() => setError(null), 3000);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const handleUpdate = (todo: Todo) => {
    setTempTodos(prev => [...prev, todo.id]);

    updateTodo({ ...todo, completed: !todo.completed })
      .then(updatedTodo => {
        setTodos(currentTodos =>
          currentTodos.map(t => (t.id === todo.id ? updatedTodo : t)),
        );
      })
      .catch(() => {
        setError('Unable to update a todo');
        setTimeout(() => setError(null), 3000);
      })
      .finally(() => {
        setTempTodos(prev => prev.filter(id => id !== todo.id));
      });
  };

  const handleDelete = (todoId: number) => {
    setTempTodos(prev => [...prev, todoId]);

    deleteTodo(todoId)
      .then(() => {
        setTodos(currentTodos =>
          currentTodos.filter(todo => todo.id !== todoId),
        );
      })
      .catch(() => {
        setError('Unable to delete a todo');
        setTimeout(() => setError(null), 3000);
      })
      .finally(() => {
        setTempTodos(prev => prev.filter(id => id !== todoId));
      });
  };

  const clearCompleted = () => {
    const completedTodos = todos.filter(todo => todo.completed);
    const idsToDelete = completedTodos.map(todo => todo.id);

    if (idsToDelete.length === 0) {
      return;
    }

    setTempTodos(prev => [...prev, ...idsToDelete]);

    const promises = idsToDelete.map(id => deleteTodo(id));

    Promise.all(promises)
      .then(() => {
        setTodos(currentTodos => currentTodos.filter(todo => !todo.completed));
      })
      .catch(() => {
        setError('Unable to delete a todo');
        setTimeout(() => setError(null), 3000);
      })
      .finally(() => {
        setTempTodos(prev => prev.filter(id => !idsToDelete.includes(id)));
      });
  };

  if (!USER_ID) {
    return <UserWarning />;
  }

  return (
    <div className="todoapp">
      <h1 className="todoapp__title">todos</h1>

      <div className="todoapp__content">
        <header className="todoapp__header">
          {todos.length > 0 && (
            <button
              type="button"
              className={classNames('todoapp__toggle-all', {
                active: todos.length > 0 && todos.every(todo => todo.completed),
              })}
              data-cy="ToggleAllButton"
              onClick={toggleAll}
            />
          )}

          <form onSubmit={handleSubmit}>
            <input
              value={title}
              onChange={event => setTitle(event.target.value)}
              data-cy="NewTodoField"
              type="text"
              className="todoapp__new-todo"
              placeholder="What needs to be done?"
              disabled={loading}
            />
          </form>
        </header>

        <section className="todoapp__main" data-cy="TodoList">
          {visibleTodos.map(todo => (
            <div
              data-cy="Todo"
              className={classNames('todo', { completed: todo.completed })}
              key={todo.id}
            >
              <label className="todo__status-label">
                <input
                  data-cy="TodoStatus"
                  type="checkbox"
                  className="todo__status"
                  checked={todo.completed}
                  onChange={() => handleUpdate(todo)}
                />
              </label>

              <span data-cy="TodoTitle" className="todo__title">
                {todo.title}
              </span>

              <button
                type="button"
                className="todo__remove"
                data-cy="TodoDelete"
                onClick={() => handleDelete(todo.id)}
              >
                ×
              </button>

              {/* Виправлений лоадер */}
              <div
                data-cy="TodoLoader"
                className={classNames('modal overlay', {
                  'is-active': tempTodos.includes(todo.id) || loading,
                })}
              >
                <div className="modal-background has-background-white-ter" />
                <div className="loader" />
              </div>
            </div>
          ))}
        </section>

        {/* Футер показуємо тільки якщо є завдання */}
        {todos.length > 0 && (
          <footer className="todoapp__footer" data-cy="Footer">
            <span className="todo-count" data-cy="TodosCounter">
              {todos.filter(t => !t.completed).length} items left
            </span>

            <nav className="filter" data-cy="Filter">
              <a
                href="#/"
                className={classNames('filter__link', {
                  selected: filter === 'all',
                })}
                data-cy="FilterLinkAll"
                onClick={() => setFilter('all')}
              >
                All
              </a>

              <a
                href="#/active"
                className={classNames('filter__link', {
                  selected: filter === 'active',
                })}
                data-cy="FilterLinkActive"
                onClick={() => setFilter('active')}
              >
                Active
              </a>

              <a
                href="#/completed"
                className={classNames('filter__link', {
                  selected: filter === 'completed',
                })}
                data-cy="FilterLinkCompleted"
                onClick={() => setFilter('completed')}
              >
                Completed
              </a>
            </nav>

            <button
              type="button"
              className="todoapp__clear-completed"
              data-cy="ClearCompletedButton"
              disabled={!todos.some(t => t.completed)}
              onClick={clearCompleted}
            >
              Clear completed
            </button>
          </footer>
        )}
      </div>

      {/* Виправлений блок помилок */}
      <div
        data-cy="ErrorNotification"
        className={classNames(
          'notification is-danger is-light has-text-weight-normal',
          { hidden: !error },
        )}
      >
        <button
          data-cy="HideErrorButton"
          type="button"
          className="delete"
          onClick={() => setError(null)}
        />
        {error}
      </div>
    </div>
  );
};
