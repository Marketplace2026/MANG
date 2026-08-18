import { Link } from 'react-router-dom'
import { clsx } from 'clsx'
import { Avatar } from './index'

/**
 * UserLink — Composant réutilisable pour rendre le nom d'utilisateur et l'avatar cliquables
 * Redirige vers /profil/:username avec propagation d'événement bloquée (e.stopPropagation())
 *
 * @param {Object} props
 * @param {Object} props.user Object utilisateur { id, username, full_name, avatar_url }
 * @param {'xs'|'sm'|'md'|'lg'|'xl'} [props.size='sm'] Taille de l'avatar et du texte
 * @param {boolean} [props.showAvatar=true] Afficher la photo de profil
 * @param {boolean} [props.showName=true] Afficher le nom complet / username
 * @param {boolean} [props.showUsername=false] Afficher le pseudo @username sous le nom
 * @param {React.ReactNode} [props.subtext=null] Sous-texte additionnel (ex: ville, timestamp)
 * @param {string} [props.className=''] Classes CSS additionnelles pour le container
 * @param {string} [props.avatarClassName=''] Classes CSS additionnelles pour l'avatar
 * @param {string} [props.nameClassName=''] Classes CSS additionnelles pour le texte
 * @param {Function} [props.onClick=null] Handler d'événement au clic optionnel
 */
export default function UserLink({
  user,
  size = 'sm',
  showAvatar = true,
  showName = true,
  showUsername = false,
  subtext = null,
  className = '',
  avatarClassName = '',
  nameClassName = '',
  onClick = null,
}) {
  if (!user) return null

  const username = user.username || user.user_metadata?.username || 'user'
  const displayName = user.full_name || user.name || user.username || 'Utilisateur'
  const avatarUrl = user.avatar_url || user.avatarUrl || user.user_metadata?.avatar_url || null

  const nameSizeClasses = {
    xs: 'text-xs font-semibold',
    sm: 'text-sm font-bold',
    md: 'text-base font-bold',
    lg: 'text-lg font-black',
    xl: 'text-xl font-black',
  }

  const handleClick = (e) => {
    e.stopPropagation()
    if (onClick) onClick(e)
  }

  return (
    <Link
      to={`/profil/${username}`}
      onClick={handleClick}
      className={clsx(
        'inline-flex items-center gap-2 group cursor-pointer hover:opacity-85 transition-opacity',
        className
      )}
    >
      {showAvatar && (
        <Avatar
          src={avatarUrl}
          name={displayName}
          size={size}
          className={clsx('transition-transform group-hover:scale-105', avatarClassName)}
        />
      )}

      {(showName || showUsername || subtext) && (
        <div className="min-w-0 flex flex-col leading-tight">
          {showName && (
            <span className={clsx('text-gray-900 dark:text-white group-hover:text-emerald-700 transition-colors truncate', nameSizeClasses[size], nameClassName)}>
              {displayName}
            </span>
          )}
          {showUsername && (
            <span className="text-xs text-gray-500 font-medium group-hover:text-emerald-700 truncate">
              @{username}
            </span>
          )}
          {subtext && (
            <span className="text-[11px] text-gray-400 font-normal truncate">
              {subtext}
            </span>
          )}
        </div>
      )}
    </Link>
  )
}
