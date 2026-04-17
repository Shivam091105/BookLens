import { Link } from 'react-router-dom'
import styles from './Footer.module.css'

export default function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <Link to="/" className={styles.logo}>
            <span className={styles.logoDot} />
            BookLens
          </Link>
          <p className={styles.desc}>
            The social platform for readers. Track every book you've read,
            share your literary journey, and discover what to read next.
          </p>
        </div>

        <div>
          <div className={styles.colTitle}>Explore</div>
          <ul className={styles.links}>
            <li><Link to="/browse">Popular books</Link></li>
            <li><Link to="/browse">New releases</Link></li>
            <li><Link to="/lists">Top lists</Link></li>
            <li><Link to="/browse">Genres</Link></li>
            <li><Link to="/browse">Awards</Link></li>
          </ul>
        </div>

        <div>
          <div className={styles.colTitle}>Community</div>
          <ul className={styles.links}>
            <li><Link to="/members">Members</Link></li>
            <li><Link to="/browse">Reviews</Link></li>
            <li><Link to="/members">Reading groups</Link></li>
            <li><Link to="/log">Journal</Link></li>
          </ul>
        </div>

        <div>
          <div className={styles.colTitle}>Company</div>
          <ul className={styles.links}>
            <li><Link to="/">About</Link></li>
            <li><a href="https://docs.anthropic.com" target="_blank" rel="noopener noreferrer">API</a></li>
            <li><Link to="/">Privacy</Link></li>
            <li><Link to="/">Terms</Link></li>
            <li><Link to="/">Contact</Link></li>
          </ul>
        </div>
      </div>

      <div className={styles.bottom}>
        <span>© {year} BookLens. All rights reserved.</span>
        <span className={styles.version}>v1.0.0-beta</span>
      </div>
    </footer>
  )
}