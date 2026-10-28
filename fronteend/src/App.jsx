import { useEffect, useState } from 'react'
import './App.css'

const API = 'http://localhost:5000/api'

function App() {
  const [loggedIn, setLoggedIn] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('User')
  const [page, setPage] = useState('Dashboard')

  const [books, setBooks] = useState([])
  const [users, setUsers] = useState([])
  const [borrows, setBorrows] = useState([])
  const [transactions, setTransactions] = useState([])

  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [genre, setGenre] = useState('')
  const [isbn, setIsbn] = useState('')
  const [quantity, setQuantity] = useState(1)

  const [newUsername, setNewUsername] = useState('')
  const[newName,setNewName]= useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newRole, setNewRole] = useState('User')

  const [borrowUser, setBorrowUser] = useState('')
  const [borrowBook, setBorrowBook] = useState('')
  const [dueDate, setDueDate] = useState('')

  const [search, setSearch] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function request(path, options = {}) {
    const response = await fetch(`${API}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      throw new Error(data.message || data.error || 'Request failed.')
    }

    return data
  }

  async function loadData() {
    setLoading(true)

    try {
      const [bookData, userData, borrowData, transactionData] =
        await Promise.all([
          request('/books'),
          request('/users'),
          request('/borrow'),
          request('/transactions')
        ])

      setBooks(Array.isArray(bookData) ? bookData : bookData.books || [])
      setUsers(Array.isArray(userData) ? userData : userData.users || [])
      setBorrows(Array.isArray(borrowData) ? borrowData : borrowData.borrows || [])
      setTransactions(
        Array.isArray(transactionData)
          ? transactionData
          : transactionData.transactions || []
      )
    } catch (error) {
      setMessage(
        'Could not load library data. Check that your Node.js server is running on port 5000.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (loggedIn) {
      loadData()
    }
  }, [loggedIn])

  function handleLogin(event) {
    event.preventDefault()

    if (!username.trim() || !password.trim()) {
      setMessage('Enter your username and password.')
      return
    }

    setMessage('')
    setLoggedIn(true)
    setPage(role === 'User' ? 'Books' : 'Dashboard')
  }

  function logout() {
    setLoggedIn(false)
    setUsername('')
    setPassword('')
    setMessage('')
    setPage('Dashboard')
  }

  async function addBook(event) {
    event.preventDefault()

    try {
      await request('/books', {
        method: 'POST',
        body: JSON.stringify({
          title,
          author,
          genre,
          isbn,
          quantity: Number(quantity)
        })
      })

      setTitle('')
      setAuthor('')
      setGenre('')
      setIsbn('')
      setQuantity(1)
      setMessage('Book added successfully.')
      await loadData()
    } catch (error) {
      setMessage(error.message)
    }
  }

  async function deleteBook(id) {
    if (!window.confirm('Are you sure you want to delete this book?')) {
      return
    }

    try {
      await request(`/books/${id}`, { method: 'DELETE' })
      setMessage('Book deleted successfully.')
      await loadData()
    } catch (error) {
      setMessage(error.message)
    }
  }

  async function registerUser(event) {
    event.preventDefault()

    try {
      await request('/users', {
        method: 'POST',
        body: JSON.stringify({
          username: newUsername,
          password: newPassword,
          role: newRole
        })
      })

      setNewUsername('')
      setNewPassword('')
      setNewRole('User')
      setMessage('User registered successfully.')
      await loadData()
    } catch (error) {
      setMessage(error.message)
    }
  }

  async function borrowBookNow(event) {
    event.preventDefault()

    if (!borrowUser || !borrowBook || !dueDate) {
      setMessage('Select a user, a book, and a due date.')
      return
    }

    const selectedBook = books.find(
      book => Number(book.id) === Number(borrowBook)
    )

    if (!selectedBook || Number(selectedBook.quantity) < 1) {
      setMessage('This book is not available.')
      return
    }

    try {
      await request('/borrow', {
        method: 'POST',
        body: JSON.stringify({
          user_id: Number(borrowUser),
          book_id: Number(borrowBook),
          borrow_date: new Date().toISOString().slice(0, 10),
          due_date: dueDate
        })
      })

      setBorrowUser('')
      setBorrowBook('')
      setDueDate('')
      setMessage('Book borrowed successfully.')
      await loadData()
    } catch (error) {
      setMessage(error.message)
    }
  }

  async function returnBook(borrow) {
    const returnDate = new Date().toISOString().slice(0, 10)

    try {
      await request(`/borrow/${borrow.id}/return`, {
        method: 'PUT',
        body: JSON.stringify({
          return_date: returnDate
        })
      })

      setMessage('Book returned successfully.')
      await loadData()
    } catch (error) {
      setMessage(error.message)
    }
  }

  const availableCopies = books.reduce(
    (total, book) => total + Number(book.quantity || 0),
    0
  )

  const activeBorrows = borrows.filter(
    borrow => borrow.status === 'borrowed' || borrow.status === 'active'
  )

  const today = new Date().toISOString().slice(0, 10)

  const overdueBooks = activeBorrows.filter(
    borrow => borrow.due_date && borrow.due_date.slice(0, 10) < today
  )

  const menuItems =
    role === 'Admin'
      ? [
          'Dashboard',
          'Books',
          'Members',
          'Borrow Books',
          'Returns',
          'Transactions',
          'Users'
        ]
      : role === 'Librarian'
        ? [
            'Dashboard',
            'Books',
            'Members',
            'Borrow Books',
            'Returns',
            'Transactions'
          ]
        : ['Books', 'Borrow Books', 'My Borrowed Books']

  if (!loggedIn) {
    return (
      <div className="login-page">
        <form className="login-card" onSubmit={handleLogin}>
          <h1>Community Library</h1>
          <p>Management System</p>

          <label>Username</label>
          <input
            value={username}
            onChange={event => setUsername(event.target.value)}
            placeholder="Enter username"
            required
          />

          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={event => setPassword(event.target.value)}
            placeholder="Enter password"
            required
          />

          <label>Login as</label>
          <select
            value={role}
            onChange={event => setRole(event.target.value)}
          >
            <option>Admin</option>
            <option>Librarian</option>
            <option>User</option>
          </select>

          <button type="submit">Login</button>

          {message && <p className="message">{message}</p>}

          <small>
            This login screen is for the frontend demonstration.
            Real password verification must be implemented in the backend.
          </small>
        </form>
      </div>
    )
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <h2>Community Library</h2>
        <p>{role} Account</p>

        <nav>
          {menuItems.map(item => (
            <button
              key={item}
              className={page === item ? 'active' : ''}
              onClick={() => {
                setPage(item)
                setMessage('')
              }}
            >
              {item}
            </button>
          ))}
        </nav>

        <button className="logout" onClick={logout}>
          Logout
        </button>
      </aside>

      <main className="content">
        <header className="topbar">
          <div>
            <h1>{page}</h1>
            <p>Welcome, {username}</p>
          </div>
          <span>{role}</span>
        </header>

        {message && (
          <p className="message" role="status">
            {message}
          </p>
        )}

        {loading && <p>Loading library data...</p>}

        {page === 'Dashboard' && role !== 'User' && (
          <>
            <section className="stats">
              <article>
                <h3>Book Titles</h3>
                <strong>{books.length}</strong>
              </article>

              <article>
                <h3>Registered Users</h3>
                <strong>{users.length}</strong>
              </article>

              <article>
                <h3>Books Borrowed</h3>
                <strong>{activeBorrows.length}</strong>
              </article>

              <article>
                <h3>Available Copies</h3>
                <strong>{availableCopies}</strong>
              </article>

              <article>
                <h3>Overdue Books</h3>
                <strong>{overdueBooks.length}</strong>
              </article>
            </section>

            <h2>Library Overview</h2>
            <p>Manage books, members, borrowing, returns, and records.</p>
          </>
        )}

        {page === 'Books' && (
          <>
            {role !== 'User' && (
              <form className="form-card" onSubmit={addBook}>
                <h2>Add New Book</h2>

                <label>Book Title</label>
                <input
                  value={title}
                  onChange={event => setTitle(event.target.value)}
                  required
                />

                <label>Author</label>
                <input
                  value={author}
                  onChange={event => setAuthor(event.target.value)}
                  required
                />

                <label>Genre</label>
                <input
                  value={genre}
                  onChange={event => setGenre(event.target.value)}
                  required
                />

                <label>ISBN</label>
                <input
                  value={isbn}
                  onChange={event => setIsbn(event.target.value)}
                  required
                />

                <label>Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={event => setQuantity(event.target.value)}
                  required
                />

                <button type="submit">Add Book</button>
              </form>
            )}

            <h2>Book Catalogue</h2>

            <input
              className="search-input"
              placeholder="Search by title or author"
              value={search}
              onChange={event => setSearch(event.target.value)}
            />

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Author</th>
                    <th>Genre</th>
                    <th>ISBN</th>
                    <th>Quantity</th>
                    {role === 'Admin' && <th>Action</th>}
                  </tr>
                </thead>

                <tbody>
                  {books
                    .filter(book =>
                      `${book.title} ${book.author}`
                        .toLowerCase()
                        .includes(search.toLowerCase())
                    )
                    .map(book => (
                      <tr key={book.id}>
                        <td>{book.title}</td>
                        <td>{book.author}</td>
                        <td>{book.genre}</td>
                        <td>{book.isbn}</td>
                        <td>{book.quantity}</td>

                        {role === 'Admin' && (
                          <td>
                            <button
                              type="button"
                              onClick={() => deleteBook(book.id)}
                            >
                              Delete
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}

                  {books.length === 0 && (
                    <tr>
                      <td colSpan="6">No books found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {page === 'Members' && role !== 'User' && (
          <>
            <h2>Registered Members</h2>
<form onSubmit={registerUser}>
  <h3>Register New Member</h3>
<input
type="text"
placeholder="Username"
value={newUsername}
onChange={(event) => setNewUsername(event.target.value)}
required
/>
<input
type="text"
placeholder="Name"
value={newName}
onChange={(event) => setNewName(event.target.value)}
required
/>
<input
type="password"
placeholder="Password"
value={newPassword}
onChange={(event) => setNewPassword(event.target.value)}
required
/>

<select
value={newRole}
onChange={(event) => setNewRole(event.target.value)}>

<option value="User">User</option>
<option value="Librarian">Librarian</option>
<option value="Admin">Admin</option>

  </select>

  <button type="submit">Register Member</button>

</form>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Username</th>
                    <th>Role</th>
                  </tr>
                </thead>

                <tbody>
                  {users.map(user => (
                    <tr key={user.id}>
                      <td>{user.id}</td>
                      <td>{user.username}</td>
                      <td>{user.role}</td>
                    </tr>
                  ))}

                  {users.length === 0 && (
                    <tr>
                      <td colSpan="3">No registered users found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {page === 'Users' && role === 'Admin' && (
          <>
            <form className="form-card" onSubmit={registerUser}>
              <h2>Register User</h2>

              <label>Username</label>
              <input
                value={newUsername}
                onChange={event => setNewUsername(event.target.value)}
                required
              />

              <label>Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={event => setNewPassword(event.target.value)}
                required
              />

              <label>Role</label>
              <select
                value={newRole}
                onChange={event => setNewRole(event.target.value)}
              >
                <option>User</option>
                <option>Librarian</option>
                <option>Admin</option>
              </select>

              <button type="submit">Register User</button>
            </form>

            <h2>System Users</h2>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Username</th>
                    <th>Role</th>
                  </tr>
                </thead>

                <tbody>
                  {users.map(user => (
                    <tr key={user.id}>
                      <td>{user.id}</td>
                      <td>{user.username}</td>
                      <td>{user.role}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {page === 'Borrow Books' && (
          <>
            <form className="form-card" onSubmit={borrowBookNow}>
              <h2>Borrow a Book</h2>

              <label>Member</label>
              <select
                value={borrowUser}
                onChange={event => setBorrowUser(event.target.value)}
                required
              >
                <option value="">Select member</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.username} ({user.role})
                  </option>
                ))}
              </select>

              <label>Book</label>
              <select
                value={borrowBook}
                onChange={event => setBorrowBook(event.target.value)}
                required
              >
                <option value="">Select book</option>
                {books
                  .filter(book => Number(book.quantity) > 0)
                  .map(book => (
                    <option key={book.id} value={book.id}>
                      {book.title} — {book.quantity} available
                    </option>
                  ))}
              </select>

              <label>Due Date</label>
              <input
                type="date"
                min={today}
                value={dueDate}
                onChange={event => setDueDate(event.target.value)}
                required
              />

              <button type="submit">Confirm Borrowing</button>
            </form>
          </>
        )}

        {(page === 'Returns' || page === 'My Borrowed Books') && (
          <>
            <h2>
              {page === 'Returns' ? 'Book Returns' : 'My Borrowed Books'}
            </h2>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Borrow ID</th>
                    <th>Member ID</th>
                    <th>Book ID</th>
                    <th>Borrow Date</th>
                    <th>Due Date</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {activeBorrows
                    .filter(borrow => {
                      if (page !== 'My Borrowed Books') return true

                      const user = users.find(
                        item => Number(item.id) === Number(borrow.user_id)
                      )

                      return user?.username === username
                    })
                    .map(borrow => (
                      <tr key={borrow.id}>
                        <td>{borrow.id}</td>
                        <td>{borrow.user_id}</td>
                        <td>{borrow.book_id}</td>
                        <td>{borrow.borrow_date?.slice(0, 10)}</td>
                        <td>{borrow.due_date?.slice(0, 10)}</td>
                        <td>{borrow.status}</td>
                        <td>
                          {(role !== 'User' ||
                            users.find(
                              user => Number(user.id) === Number(borrow.user_id)
                            )?.username === username) && (
                            <button
                              type="button"
                              onClick={() => returnBook(borrow)}
                            >
                              Return Book
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}

                  {activeBorrows.length === 0 && (
                    <tr>
                      <td colSpan="7">No active borrowed books.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {page === 'Transactions' && role !== 'User' && (
          <>
            <h2>Transaction History</h2>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Transaction ID</th>
                    <th>Book ID</th>
                    <th>User ID</th>
                    <th>Transaction Type</th>
                    <th>Quantity</th>
                    <th>Date</th>
                  </tr>
                </thead>

                <tbody>
                  {transactions.map(transaction => (
                    <tr key={transaction.id}>
                      <td>{transaction.id}</td>
                      <td>{transaction.book_id}</td>
                      <td>{transaction.user_id}</td>
                      <td>{transaction.transaction_type}</td>
                      <td>{transaction.quantity}</td>
                      <td>
                        {transaction.transaction_date?.slice(0, 10)}
                      </td>
                    </tr>
                  ))}

                  {transactions.length === 0 && (
                    <tr>
                      <td colSpan="6">No transactions found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>
    </div>
  )
}

export default App 
