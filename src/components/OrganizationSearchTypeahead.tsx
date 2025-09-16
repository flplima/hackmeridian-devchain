"use client"

import { useState, useEffect } from "react"
import Select, { SingleValue, StylesConfig } from "react-select"

interface Organization {
  id: string
  name: string
  description?: string
  stellarAddress?: string
}

interface OrganizationOption {
  value: Organization
  label: string
  organization: Organization
}

interface OrganizationSearchTypeaheadProps {
  onOrganizationSelect: (organization: Organization) => void
  placeholder?: string
  className?: string
}

export default function OrganizationSearchTypeahead({
  onOrganizationSelect,
  placeholder = "Search for an organization...",
  className = ""
}: OrganizationSearchTypeaheadProps) {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const searchOrganizations = async (searchQuery: string) => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      return []
    }

    setIsLoading(true)
    try {
      const response = await fetch(`/api/organizations?q=${encodeURIComponent(searchQuery)}&limit=10`)
      if (response.ok) {
        const data = await response.json()
        return data.organizations || []
      }
    } catch (error) {
      console.error("Error searching organizations:", error)
      return []
    } finally {
      setIsLoading(false)
    }
    return []
  }

  const loadOptions = async (inputValue: string): Promise<OrganizationOption[]> => {
    const organizations = await searchOrganizations(inputValue)
    return organizations.map((org: Organization) => ({
      value: org,
      label: org.name,
      organization: org
    }))
  }

  const handleOrganizationSelect = (option: SingleValue<OrganizationOption>) => {
    if (option) {
      onOrganizationSelect(option.organization)
    }
  }

  const formatOptionLabel = ({ organization }: OrganizationOption) => (
    <div className="flex items-center space-x-3 py-1">
      <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
        <span className="text-blue-700 font-medium text-sm">
          {organization.name.charAt(0).toUpperCase()}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 truncate">{organization.name}</p>
        {organization.description && (
          <p className="text-sm text-gray-500 truncate">{organization.description}</p>
        )}
        {organization.stellarAddress && (
          <p className="text-xs text-blue-600 font-mono truncate">
            {organization.stellarAddress}
          </p>
        )}
      </div>
    </div>
  )

  const customStyles: StylesConfig<OrganizationOption, false> = {
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
      zIndex: 50
    }),
    menuList: (provided) => ({
      ...provided,
      maxHeight: '240px'
    })
  }

  return (
    <div className={className}>
      <Select<OrganizationOption>
        cacheOptions
        loadOptions={loadOptions}
        defaultOptions={false}
        placeholder={placeholder}
        noOptionsMessage={({ inputValue }) =>
          inputValue.length < 2
            ? "Type at least 2 characters to search..."
            : "No organizations found"
        }
        isLoading={isLoading}
        onChange={handleOrganizationSelect}
        formatOptionLabel={formatOptionLabel}
        styles={customStyles}
        isClearable
        isSearchable
      />
    </div>
  )
}