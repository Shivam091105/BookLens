import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { usersApi } from '../api/users'
import { reviewsApi } from '../api/reviews'
import { logsApi } from '../api/logs'
import { useFollowUser } from '../hooks/useUser'
import { Skeleton } from '../components/ui/Skeleton'
import ReviewCard from '../components/book/ReviewCard'
import useAuthStore from '../store/authStore'
import styles from './MembersPage.module.css'

/* ── Static member seed data (shown when API returns nothing) ─────────────── */
const STATIC_MEMBERS = [
    { id: 's1', username: 'priya_reads', displayName: 'Priya Sharma', bio: 'Literary fiction devotee. Dostoevsky, Woolf, Ishiguro. Working through every Booker Prize winner.', location: 'Mumbai, India', booksRead: 284, followersCount: 312, followingCount: 148, memberSince: '2022-03-12', topGenres: ['Literary Fiction', 'Classics', 'Historical'] },
    { id: 's2', username: 'bookish_dan', displayName: 'Dan Okafor', bio: 'Sci-fi aficionado and occasional fantasy drifter. Currently obsessed with everything Ursula K. Le Guin.', location: 'Lagos, Nigeria', booksRead: 197, followersCount: 204, followingCount: 91, memberSince: '2023-01-07', topGenres: ['Science Fiction', 'Fantasy', 'Classics'] },
    { id: 's3', username: 'maya_liu', displayName: 'Maya Liu', bio: 'Translator by day, compulsive reader by night. Passionate about world literature in translation.', location: 'Shanghai, China', booksRead: 431, followersCount: 587, followingCount: 203, memberSince: '2021-09-24', topGenres: ['World Lit', 'Literary Fiction', 'Poetry'] },
    { id: 's4', username: 'literaryleo', displayName: 'Leonardo Rossi', bio: 'Building the ultimate Italian literature reading list. Dante, Calvino, Ferrante. Rome, always Rome.', location: 'Rome, Italy', booksRead: 356, followersCount: 471, followingCount: 167, memberSince: '2022-07-15', topGenres: ['Classics', 'Historical', 'Literary Fiction'] },
    { id: 's5', username: 'readingwren', displayName: 'Wren Nakamura', bio: 'Slow reader, fast thinker. I take notes in the margins and loan books to strangers on trains.', location: 'Kyoto, Japan', booksRead: 163, followersCount: 129, followingCount: 88, memberSince: '2023-06-01', topGenres: ['Japanese Lit', 'Literary Fiction', 'Non-Fiction'] },
    { id: 's6', username: 'sarah_reads', displayName: 'Sarah Okonkwo', bio: "Chasing every Women's Prize longlist since 2019. Also secretly loves romance novels and won't apologize.", location: 'Nairobi, Kenya', booksRead: 312, followersCount: 398, followingCount: 212, memberSince: '2022-02-28', topGenres: ['Literary Fiction', 'Romance', 'Memoir'] },
    { id: 's7', username: 'jorge_b', displayName: 'Jorge Beltrán', bio: 'García Márquez changed my life at 14. Still recovering. Latin American lit is my whole personality.', location: 'Bogotá, Colombia', booksRead: 847, followersCount: 1104, followingCount: 340, memberSince: '2020-11-19', topGenres: ['Latin American', 'Magical Realism', 'Classics'] },
    { id: 's8', username: 'nonfic_nina', displayName: 'Nina Petrov', bio: 'Non-fiction only. History, science, biography. Life is too short for made-up problems.', location: 'Prague, Czechia', booksRead: 204, followersCount: 176, followingCount: 72, memberSince: '2023-04-11', topGenres: ['Non-Fiction', 'History', 'Biography'] },
    { id: 's9', username: 'kiran_sf', displayName: 'Kiran Mehta', bio: 'Hard science fiction or nothing. Physicist by training, reader by compulsion. Collecting every Hugo winner.', location: 'Bangalore, India', booksRead: 589, followersCount: 643, followingCount: 291, memberSince: '2021-05-03', topGenres: ['Science Fiction', 'Hard Sci-Fi', 'Science'] },
    { id: 's10', username: 'classics_only', displayName: 'Clara Whitmore', bio: "Pre-1900 or I'm not interested. Austen, Eliot, Hardy, Tolstoy. The canon exists for a reason.", location: 'Edinburgh, UK', booksRead: 501, followersCount: 388, followingCount: 104, memberSince: '2022-08-30', topGenres: ['Classics', 'Victorian', 'Russian Lit'] },
    { id: 's11', username: 'haruki_fan', displayName: 'Aiko Tanaka', bio: 'Murakami changed how I read. Jazz, cats, pasta, and surrealism. Also obsessed with Scandinavian crime fiction.', location: 'Tokyo, Japan', booksRead: 278, followersCount: 334, followingCount: 178, memberSince: '2022-11-14', topGenres: ['Japanese Lit', 'Crime', 'Literary Fiction'] },
    { id: 's12', username: 'world_lit', displayName: 'Amara Diallo', bio: 'African literature first, everything else second. Achebe, Adichie, Ngugi. Collecting Nobel winners.', location: 'Accra, Ghana', booksRead: 392, followersCount: 521, followingCount: 225, memberSince: '2021-12-05', topGenres: ['African Lit', 'World Lit', 'Literary Fiction'] },
]

function colorIndex(str) {
    if (!str) return 1
    let h = 0
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0
    return (h % 8) + 1
}

function avatarGradient(username) {
    const gradients = [
        'linear-gradient(135deg,#1c5e3a,#0d2e1a)',
        'linear-gradient(135deg,#1c3a5e,#0a1f3a)',
        'linear-gradient(135deg,#5e1c3a,#2e0a1f)',
        'linear-gradient(135deg,#3a3a1c,#1f1f0a)',
        'linear-gradient(135deg,#2d1b4e,#180f2e)',
        'linear-gradient(135deg,#4e2d1b,#2e180f)',
        'linear-gradient(135deg,#1b4e2d,#0f2e18)',
        'linear-gradient(135deg,#1b2d4e,#0f182e)',
    ]
    let h = 0
    for (let i = 0; i < (username?.length || 0); i++) h = (h * 31 + username.charCodeAt(i)) >>> 0
    return gradients[h % gradients.length]
}

/* ── Main page ────────────────────────────────────────────────────────────── */
export default function MembersPage() {
    const { user: me, isAuthenticated } = useAuthStore()
    const [search, setSearch] = useState('')
    const [sort, setSort] = useState('popular') // popular | active | new
    const [selectedMember, setSelectedMember] = useState(null)
    const navigate = useNavigate()

    const filteredMembers = useMemo(() => {
        let list = [...STATIC_MEMBERS]
        if (search.trim()) {
            const q = search.toLowerCase()
            list = list.filter(m =>
                m.username.toLowerCase().includes(q) ||
                m.displayName.toLowerCase().includes(q) ||
                m.location?.toLowerCase().includes(q) ||
                m.topGenres?.some(g => g.toLowerCase().includes(q))
            )
        }
        if (sort === 'popular') list.sort((a, b) => b.followersCount - a.followersCount)
        else if (sort === 'active') list.sort((a, b) => b.booksRead - a.booksRead)
        else if (sort === 'new') list.sort((a, b) => new Date(b.memberSince) - new Date(a.memberSince))
        return list
    }, [search, sort])

    if (selectedMember) {
        return (
            <MemberProfile
                member={selectedMember}
                onBack={() => setSelectedMember(null)}
                meId={me?.id}
                isAuthenticated={isAuthenticated}
            />
        )
    }

    return (
        <div className={styles.page}>
            {/* Page header */}
            <div className={styles.pageHeader}>
                <div className={styles.pageHeaderInner}>
                    <div>
                        <h1 className={styles.pageTitle}>Members</h1>
                        <p className={styles.pageSubtitle}>
                            Discover readers, explore their shelves, and follow the ones who share your taste.
                        </p>
                    </div>
                    <div className={styles.memberCount}>
                        <span className={styles.memberCountNum}>{STATIC_MEMBERS.length}</span>
                        <span className={styles.memberCountLabel}>readers</span>
                    </div>
                </div>
            </div>

            {/* Toolbar */}
            <div className={styles.toolbar}>
                <div className={styles.toolbarInner}>
                    <div className={styles.searchWrap}>
                        <span className={styles.searchIcon}>⌕</span>
                        <input
                            className={styles.searchInput}
                            placeholder="Search by name, genre, location…"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                        {search && (
                            <button className={styles.searchClear} onClick={() => setSearch('')}>×</button>
                        )}
                    </div>
                    <div className={styles.sortGroup}>
                        {[['popular', 'Most followed'], ['active', 'Most read'], ['new', 'Newest']].map(([val, label]) => (
                            <button
                                key={val}
                                className={`${styles.sortBtn} ${sort === val ? styles.sortActive : ''}`}
                                onClick={() => setSort(val)}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Members grid */}
            <div className={styles.content}>
                {filteredMembers.length === 0 ? (
                    <div className={styles.empty}>
                        <div className={styles.emptyTitle}>No members found</div>
                        <div className={styles.emptyDesc}>Try a different search term.</div>
                    </div>
                ) : (
                    <div className={styles.membersGrid}>
                        {filteredMembers.map(member => (
                            <MemberCard
                                key={member.id}
                                member={member}
                                meId={me?.id}
                                isAuthenticated={isAuthenticated}
                                onViewProfile={() => setSelectedMember(member)}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

/* ── Member Card ─────────────────────────────────────────────────────────── */
function MemberCard({ member, meId, isAuthenticated, onViewProfile }) {
    const [following, setFollowing] = useState(false)
    const [followerDelta, setFollowerDelta] = useState(0)
    const followMutation = useFollowUser()

    const isSelf = meId && String(meId) === String(member.id)

    function handleFollow(e) {
        e.stopPropagation()
        if (!isAuthenticated) return
        const next = !following
        setFollowing(next)
        setFollowerDelta(next ? 1 : -1)
        // Real API: followMutation.mutate({ userId: member.id, isFollowing: following, username: member.username })
    }

    const initials = member.displayName
        ? member.displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
        : member.username.slice(0, 2).toUpperCase()

    return (
        <div className={styles.memberCard} onClick={onViewProfile}>
            <div className={styles.cardTop}>
                <div className={styles.memberAvatar} style={{ background: avatarGradient(member.username) }}>
                    {initials}
                </div>
                {!isSelf && (
                    <button
                        className={`${styles.followBtn} ${following ? styles.followingBtn : ''}`}
                        onClick={handleFollow}
                        type="button"
                    >
                        {following ? 'Following' : 'Follow'}
                    </button>
                )}
            </div>

            <div className={styles.memberName}>{member.displayName}</div>
            <div className={styles.memberHandle}>@{member.username}</div>
            {member.location && <div className={styles.memberLocation}>📍 {member.location}</div>}
            {member.bio && <p className={styles.memberBio}>{member.bio}</p>}

            <div className={styles.memberGenres}>
                {member.topGenres?.slice(0, 2).map(g => (
                    <span key={g} className={styles.genreChip}>{g}</span>
                ))}
            </div>

            <div className={styles.memberStats}>
                <div className={styles.memberStat}>
                    <span className={styles.statNum}>{member.booksRead.toLocaleString()}</span>
                    <span className={styles.statLabel}>books</span>
                </div>
                <div className={styles.statDivider} />
                <div className={styles.memberStat}>
                    <span className={styles.statNum}>{(member.followersCount + followerDelta).toLocaleString()}</span>
                    <span className={styles.statLabel}>followers</span>
                </div>
                <div className={styles.statDivider} />
                <div className={styles.memberStat}>
                    <span className={styles.statNum}>{member.followingCount.toLocaleString()}</span>
                    <span className={styles.statLabel}>following</span>
                </div>
            </div>

            <div className={styles.viewProfile}>View full profile →</div>
        </div>
    )
}

/* ── Member Profile (drill-down) ─────────────────────────────────────────── */
const PROFILE_TABS = ['Overview', 'Reviews', 'Lists']

const MEMBER_REVIEWS = {
    priya_reads: [
        { id: 'r1', bookTitle: 'The Brothers Karamazov', bookAuthor: 'Fyodor Dostoevsky', coverColor: 'bc1', username: 'priya_reads', rating: 5, text: "Dostoevsky doesn't write characters — he excavates them. Every page is a reckoning. I've never felt so simultaneously destroyed and elevated by a novel.", likes: 204, date: 'Jan 12, 2025', isPopular: true },
        { id: 'r2', bookTitle: 'Intermezzo', bookAuthor: 'Sally Rooney', coverColor: 'bc3', username: 'priya_reads', rating: 5, text: "Rooney is at her finest here. The prose is immaculate — cool and surgical but always humming with feeling underneath. This is the novel about grief I didn't know I needed.", likes: 412, date: 'Nov 8, 2024', isPopular: true },
    ],
    maya_liu: [
        { id: 'r3', bookTitle: 'Normal People', bookAuthor: 'Sally Rooney', coverColor: 'bc2', username: 'maya_liu', rating: 4, text: "The translation challenge of Rooney is the silence between words. In my native language, this book would read completely differently. There's a loneliness to English here that is very specific.", likes: 87, date: 'Dec 2, 2024', isPopular: false },
    ],
    readingwren: [
        { id: 'r4', bookTitle: 'Pachinko', bookAuthor: 'Min Jin Lee', coverColor: 'bc4', username: 'readingwren', rating: 5, text: "Every generation carries its wounds quietly. This book is a monument to that silence — and to those who broke it. I cried three times, for three different people.", likes: 318, date: 'Dec 28, 2024', isPopular: true },
    ],
    jorge_b: [
        { id: 'r5', bookTitle: 'One Hundred Years of Solitude', bookAuthor: 'Gabriel García Márquez', coverColor: 'bc6', username: 'jorge_b', rating: 5, text: "To read García Márquez in Spanish is to understand why translation is always loss. This novel contains the smell of yellow flowers. No translation has ever gotten that.", likes: 531, date: 'Sep 14, 2024', isPopular: true },
    ],
}

const MEMBER_LISTS = {
    priya_reads: [
        { title: 'Booker Prize Winners', desc: 'Every winner since 2000, ranked by personal devastation.', count: 24, covers: ['bc1', 'bc3', 'bc5', 'bc7'] },
        { title: 'Books That Changed Me', desc: 'The ones I\'d give to a stranger.', count: 8, covers: ['bc2', 'bc4', 'bc6', 'bc8'] },
    ],
    maya_liu: [
        { title: 'Best in Translation', desc: 'World literature that survives the journey across languages.', count: 40, covers: ['bc3', 'bc1', 'bc6', 'bc2'] },
    ],
    jorge_b: [
        { title: 'Latin American Canon', desc: 'The essential reading list for understanding the region.', count: 62, covers: ['bc6', 'bc4', 'bc2', 'bc8'] },
        { title: 'Nobel Winners Ranked', desc: 'All the Nobel laureates, ranked by lingering emotional impact.', count: 118, covers: ['bc1', 'bc5', 'bc3', 'bc7'] },
    ],
}

const RECENT_BOOKS = {
    priya_reads: [
        { title: 'The Brothers Karamazov', author: 'Dostoevsky', color: 'bc1', status: 'READ' },
        { title: 'Intermezzo', author: 'Sally Rooney', color: 'bc3', status: 'READ' },
        { title: 'Middlemarch', author: 'George Eliot', color: 'bc7', status: 'READING' },
        { title: 'Demon Copperhead', author: 'Kingsolver', color: 'bc5', status: 'READ' },
        { title: 'The Secret History', author: 'Donna Tartt', color: 'bc2', status: 'WANT' },
        { title: 'Pachinko', author: 'Min Jin Lee', color: 'bc4', status: 'READ' },
    ],
    maya_liu: [
        { title: 'Normal People', author: 'Sally Rooney', color: 'bc2', status: 'READ' },
        { title: 'A Little Life', author: 'Hanya Yanagihara', color: 'bc5', status: 'READ' },
        { title: 'Convenience Store Woman', author: 'Sayaka Murata', color: 'bc6', status: 'READ' },
        { title: 'The Vegetarian', author: 'Han Kang', color: 'bc4', status: 'READ' },
        { title: 'Tomorrow, and Tomorrow', author: 'Gabrielle Zevin', color: 'bc3', status: 'READING' },
    ],
}

function MemberProfile({ member, onBack, meId, isAuthenticated }) {
    const [activeTab, setActiveTab] = useState('Overview')
    const [following, setFollowing] = useState(false)
    const [followerDelta, setFollowerDelta] = useState(0)

    const isSelf = meId && String(meId) === String(member.id)
    const initials = member.displayName
        ? member.displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
        : member.username.slice(0, 2).toUpperCase()

    const reviews = MEMBER_REVIEWS[member.username] || []
    const lists = MEMBER_LISTS[member.username] || []
    const recentBooks = RECENT_BOOKS[member.username] || []

    function handleFollow() {
        if (!isAuthenticated) return
        setFollowing(p => !p)
        setFollowerDelta(p => following ? p - 1 : p + 1)
    }

    const memberSinceLabel = member.memberSince
        ? new Date(member.memberSince).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        : '—'

    return (
        <div className={styles.page}>
            {/* Back button */}
            <div className={styles.backBar}>
                <div className={styles.backBarInner}>
                    <button className={styles.backBtn} onClick={onBack}>
                        ← Back to Members
                    </button>
                </div>
            </div>

            {/* Banner */}
            <div className={styles.profileBanner} />

            {/* Profile header */}
            <div className={styles.profileHeaderWrap}>
                <div className={styles.profileHeaderInner}>
                    <div className={styles.profileAvatarXl} style={{ background: avatarGradient(member.username) }}>
                        {initials}
                    </div>
                    <div className={styles.profileIdentity}>
                        <div className={styles.profileName}>{member.displayName}</div>
                        <div className={styles.profileHandle}>@{member.username}</div>
                        {member.bio && <p className={styles.profileBio}>{member.bio}</p>}
                        {member.location && <div className={styles.profileLocation}>📍 {member.location}</div>}
                        <div className={styles.profileGenres}>
                            {member.topGenres?.map(g => (
                                <span key={g} className={styles.genreChip}>{g}</span>
                            ))}
                        </div>
                    </div>
                    <div className={styles.profileActions}>
                        {!isSelf && (
                            <button
                                className={`${styles.profileFollowBtn} ${following ? styles.profileFollowingBtn : ''}`}
                                onClick={handleFollow}
                                type="button"
                            >
                                {following ? '✓ Following' : '+ Follow'}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Stats bar */}
            <div className={styles.statsBar}>
                <div className={styles.statsBarInner}>
                    {[
                        ['Books', member.booksRead.toLocaleString()],
                        ['Reviews', reviews.length || '—'],
                        ['Lists', (lists.length || member.listsCount || 0)],
                        ['Followers', (member.followersCount + followerDelta).toLocaleString()],
                        ['Following', member.followingCount.toLocaleString()],
                        ['Member since', memberSinceLabel],
                    ].map(([label, val]) => (
                        <div key={label} className={styles.statItem}>
                            <div className={styles.statItemNum}>{val}</div>
                            <div className={styles.statItemLabel}>{label}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Tab bar */}
            <div className={styles.tabBar}>
                <div className={styles.tabBarInner}>
                    {PROFILE_TABS.map(t => (
                        <button
                            key={t}
                            className={`${styles.tab} ${activeTab === t ? styles.tabActive : ''}`}
                            onClick={() => setActiveTab(t)}
                        >
                            {t}
                            {t === 'Reviews' && reviews.length > 0 && (
                                <span className={styles.tabCount}>{reviews.length}</span>
                            )}
                            {t === 'Lists' && lists.length > 0 && (
                                <span className={styles.tabCount}>{lists.length}</span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tab content */}
            <div className={styles.profileContent}>

                {/* OVERVIEW */}
                {activeTab === 'Overview' && (
                    <div className={styles.overviewLayout}>
                        <div className={styles.overviewMain}>
                            <div className={styles.sectionTitle}>Recent reads</div>
                            {recentBooks.length > 0 ? (
                                <div className={styles.recentBooks}>
                                    {recentBooks.map((book, i) => (
                                        <div key={i} className={styles.recentBookItem}>
                                            <div className={`${styles.recentBookCover} ${book.color}`} />
                                            <div className={styles.recentBookInfo}>
                                                <div className={styles.recentBookTitle}>{book.title}</div>
                                                <div className={styles.recentBookAuthor}>{book.author}</div>
                                            </div>
                                            <span className={`${styles.statusPill} ${styles['status' + book.status]}`}>
                                                {book.status === 'READ' ? 'Read' : book.status === 'READING' ? 'Reading' : 'Want'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className={styles.emptyInline}>No public diary entries.</div>
                            )}

                            {reviews.length > 0 && (
                                <>
                                    <div className={styles.sectionTitle} style={{ marginTop: 32 }}>
                                        Recent reviews
                                        <button className={styles.seeAllBtn} onClick={() => setActiveTab('Reviews')}>
                                            See all →
                                        </button>
                                    </div>
                                    <div className={styles.reviewsList}>
                                        {reviews.slice(0, 2).map(r => (
                                            <ReviewCard key={r.id} review={r} />
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>

                        <div className={styles.overviewSidebar}>
                            <div className={styles.sideWidget}>
                                <div className={styles.sideWidgetTitle}>About</div>
                                <div className={styles.aboutRows}>
                                    <div className={styles.aboutRow}>
                                        <span className={styles.aboutLabel}>Member since</span>
                                        <span className={styles.aboutValue}>{memberSinceLabel}</span>
                                    </div>
                                    {member.location && (
                                        <div className={styles.aboutRow}>
                                            <span className={styles.aboutLabel}>Location</span>
                                            <span className={styles.aboutValue}>{member.location}</span>
                                        </div>
                                    )}
                                    <div className={styles.aboutRow}>
                                        <span className={styles.aboutLabel}>Books read</span>
                                        <span className={styles.aboutValue}>{member.booksRead.toLocaleString()}</span>
                                    </div>
                                    <div className={styles.aboutRow}>
                                        <span className={styles.aboutLabel}>Reviews</span>
                                        <span className={styles.aboutValue}>{reviews.length || '—'}</span>
                                    </div>
                                </div>
                            </div>

                            <div className={styles.sideWidget}>
                                <div className={styles.sideWidgetTitle}>Favourite genres</div>
                                <div className={styles.genreList}>
                                    {member.topGenres?.map((g, i) => (
                                        <div key={g} className={styles.genreRow}>
                                            <span className={styles.genreRank}>{i + 1}</span>
                                            <span className={styles.genreName}>{g}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* REVIEWS */}
                {activeTab === 'Reviews' && (
                    <div>
                        <div className={styles.tabSectionHeader}>
                            <span className={styles.sectionTitle} style={{ margin: 0 }}>Reviews</span>
                            <span className={styles.metaCount}>{reviews.length} total</span>
                        </div>
                        {reviews.length > 0 ? (
                            <div className={styles.reviewsGrid}>
                                {reviews.map(r => <ReviewCard key={r.id} review={r} />)}
                            </div>
                        ) : (
                            <div className={styles.emptyTab}>
                                <div className={styles.emptyTitle}>No reviews yet</div>
                                <div className={styles.emptyDesc}>{member.displayName} hasn't written any reviews.</div>
                            </div>
                        )}
                    </div>
                )}

                {/* LISTS */}
                {activeTab === 'Lists' && (
                    <div>
                        <div className={styles.tabSectionHeader}>
                            <span className={styles.sectionTitle} style={{ margin: 0 }}>Lists</span>
                            <span className={styles.metaCount}>{lists.length} lists</span>
                        </div>
                        {lists.length > 0 ? (
                            <div className={styles.listsGrid}>
                                {lists.map((list, i) => (
                                    <div key={i} className={styles.listCard}>
                                        <div className={styles.listCardCovers}>
                                            {list.covers.slice(0, 4).map((c, j) => (
                                                <div key={j} className={`${styles.listCoverMini} ${c}`} />
                                            ))}
                                        </div>
                                        <div className={styles.listCardBody}>
                                            <div className={styles.listCardTitle}>{list.title}</div>
                                            {list.desc && <p className={styles.listCardDesc}>{list.desc}</p>}
                                            <div className={styles.listCardMeta}>{list.count} books</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className={styles.emptyTab}>
                                <div className={styles.emptyTitle}>No public lists</div>
                                <div className={styles.emptyDesc}>{member.displayName} hasn't created any lists yet.</div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}