"use client"

import { useState, useEffect } from "react"
import Select, { SingleValue, StylesConfig } from "react-select"

interface User {
  id: string
  name: string
  email: string
  githubHandle: string
  githubId: number
  profileImage?: string
  stellarAddress?: string
}

interface UserOption {
  value: User
  label: string
  user: User
}

interface UserSearchTypeaheadProps {
  onUserSelect: (user: User) => void
  placeholder?: string
  className?: string
}

export default function UserSearchTypeahead({
  onUserSelect,
  placeholder = "Search for a developer...",
  className = ""
}: UserSearchTypeaheadProps) {
  const [options, setOptions] = useState<UserOption[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")

  // Search GitHub users when search term changes
  useEffect(() => {
    const searchUsers = async () => {
      if (!searchTerm || searchTerm.trim().length < 2) {
        setOptions([])
        return
      }

      setIsLoading(true)
      try {
        const response = await fetch(`/api/github/search/users?q=${encodeURIComponent(searchTerm)}`)
        if (response.ok) {
          const data = await response.json()
          const users = data.users || []
          console.log('Fetched GitHub users:', users.length, users)

          // Convert to options format
          const userOptions = users.map((user: User) => ({
            value: user,
            label: `${user.githubHandle}`, // Use just github handle for label
            user
          }))
          setOptions(userOptions)
        } else {
          console.error('GitHub search API error:', response.status, response.statusText)
          setOptions([])
        }
      } catch (error) {
        console.error("Error searching GitHub users:", error)
        setOptions([])
      } finally {
        setIsLoading(false)
      }
    }

    // Debounce the search
    const timeoutId = setTimeout(searchUsers, 300)
    return () => clearTimeout(timeoutId)
  }, [searchTerm])

  const handleUserSelect = (option: SingleValue<UserOption>) => {
    if (option) {
      onUserSelect(option.user)
    }
  }

  const formatOptionLabel = ({ user }: UserOption) => (
    <div className="flex items-center space-x-3 py-1">
      {user.profileImage ? (
        <img
          src={user.profileImage}
          alt={user.name}
          className="h-8 w-8 rounded-full flex-shrink-0"
        />
      ) : (
        <div className="h-8 w-8 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
          <span className="text-gray-600 font-medium text-sm">
            {user.name.charAt(0).toUpperCase()}
          </span>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 truncate">{user.name}</p>
        <p className="text-sm text-gray-500 truncate">@{user.githubHandle}</p>
      </div>
    </div>
  )

  const customStyles: StylesConfig<UserOption, false> = {
    control: (provided, state) => ({
      ...provided,
      marginTop: '0.25rem',
      borderColor: state.isFocused ? '#3b82f6' : '#d1d5db',
      borderRadius: '0.375rem',
      borderWidth: '1px',
      boxShadow: state.isFocused ? '0 0 0 2px rgb(59 130 246 / 0.5)' : 'none',
      '&:hover': {
        borderColor: state.isFocused ? '#3b82f6' : '#d1d5db'
      }
    }),
    option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isFocused ? '#f3f4f6' : 'white',
      color: '#111827',
      padding: '8px 12px'
    }),
    menu: (provided) => ({
      ...provided,
      zIndex: 9999
    }),
    menuList: (provided) => ({
      ...provided,
      maxHeight: '240px'
    })
  }

  return (
    <div className={className}>
      <Select<UserOption>
        options={options}
        placeholder={placeholder}
        noOptionsMessage={() => searchTerm.length < 2 ? "Type to search GitHub users..." : "No users found"}
        isLoading={isLoading}
        onChange={handleUserSelect}
        onInputChange={(value) => setSearchTerm(value)}
        formatOptionLabel={formatOptionLabel}
        styles={customStyles}
        isClearable
        isSearchable
        filterOption={() => true} // Disable client-side filtering since we do server-side search
      />
    </div>
  )
}