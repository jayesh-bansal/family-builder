/**
 * Banyan tree logo — a stylized tree with spreading roots and a wide canopy.
 * Used as the app's brand icon across Navbar, landing, auth, etc.
 */
export default function BanyanLogo({
  className = "h-8 w-8",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Canopy — wide, organic crown */}
      <ellipse cx="32" cy="18" rx="22" ry="14" fill="#2A9D8F" opacity="0.85" />
      <ellipse cx="22" cy="22" rx="12" ry="10" fill="#2A9D8F" opacity="0.6" />
      <ellipse cx="42" cy="22" rx="12" ry="10" fill="#2A9D8F" opacity="0.6" />
      <ellipse cx="32" cy="14" rx="14" ry="9" fill="#48B5A8" opacity="0.5" />
      {/* Main trunk */}
      <rect x="29" y="28" width="6" height="20" rx="2" fill="#8B5E3C" />
      {/* Aerial roots — left */}
      <path
        d="M24 26 C22 34, 20 42, 18 52"
        stroke="#8B5E3C"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M22 30 C19 38, 14 44, 12 52"
        stroke="#8B5E3C"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
        opacity="0.7"
      />
      {/* Aerial roots — right */}
      <path
        d="M40 26 C42 34, 44 42, 46 52"
        stroke="#8B5E3C"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M42 30 C45 38, 50 44, 52 52"
        stroke="#8B5E3C"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
        opacity="0.7"
      />
      {/* Ground line */}
      <path
        d="M8 52 Q32 56 56 52"
        stroke="#8B5E3C"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
        opacity="0.4"
      />
    </svg>
  );
}
