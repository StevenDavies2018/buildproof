'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

type Category = {
  categorySlug: string
  categoryParent: string | null
  categoryName: string | null
}

type Taxonomy = {
  label: string
  campaignCount: number
}

export function HierarchicalCategoryFilters({
  categories,
  taxonomy,
  defaultParent,
  defaultSubcategory,
  defaultTaxonomy,
  submitOnCategoryChange = false,
  dark = false,
}: {
  categories: Category[]
  taxonomy: Taxonomy[]
  defaultParent: string
  defaultSubcategory: string
  defaultTaxonomy: string
  submitOnCategoryChange?: boolean
  dark?: boolean
}) {
  const [parent, setParent] = useState(defaultParent)
  const [subcategory, setSubcategory] = useState(defaultSubcategory)
  const [taxonomyLabel, setTaxonomyLabel] = useState(defaultTaxonomy)
  const [pendingSubmit, setPendingSubmit] = useState(false)
  const pendingFormRef = useRef<HTMLFormElement | null>(null)
  const fieldClass = dark ? 'bs-field bs-field-dark' : 'bs-field'
  const labelClass = dark
    ? 'text-xs font-semibold uppercase tracking-[0.18em] text-blue-100/70'
    : 'bs-kicker'
  const mainCategories = useMemo(
    () => Array.from(new Set(categories.map((category) => category.categoryParent).filter(Boolean))) as string[],
    [categories],
  )
  const subcategories = useMemo(
    () => categories.filter((category) => parent === '__all__' || !parent || category.categoryParent === parent),
    [categories, parent],
  )
  const taxonomyOptions = useMemo(() => {
    if (!taxonomyLabel || taxonomy.some((item) => item.label === taxonomyLabel)) {
      return taxonomy
    }

    return [{ label: taxonomyLabel, campaignCount: 0 }, ...taxonomy]
  }, [taxonomy, taxonomyLabel])

  useEffect(() => {
    setParent(defaultParent)
  }, [defaultParent])

  useEffect(() => {
    setSubcategory(defaultSubcategory)
  }, [defaultSubcategory])

  useEffect(() => {
    setTaxonomyLabel(defaultTaxonomy)
  }, [defaultTaxonomy])

  useEffect(() => {
    if (!pendingSubmit || !submitOnCategoryChange) return
    pendingFormRef.current?.requestSubmit()
    pendingFormRef.current = null
    setPendingSubmit(false)
  }, [pendingSubmit, submitOnCategoryChange])

  function changeParent(value: string, form: HTMLFormElement | null) {
    setParent(value)
    setSubcategory(value ? '__all__' : '')
    setTaxonomyLabel('')
    pendingFormRef.current = form
    setPendingSubmit(true)
  }

  function changeSubcategory(value: string, form: HTMLFormElement | null) {
    setSubcategory(value)
    setTaxonomyLabel('')
    pendingFormRef.current = form
    setPendingSubmit(true)
  }

  return (
    <>
      <label className="grid gap-2">
        <span className={labelClass}>Main category</span>
        <select name="categoryParent" value={parent} onChange={(event) => changeParent(event.target.value, event.currentTarget.form)} className={fieldClass}>
          <option value="__all__">All categories</option>
          {mainCategories.map((category) => <option key={category} value={category}>{category}</option>)}
        </select>
      </label>
      <label className="grid gap-2">
        <span className={labelClass}>Subcategory</span>
        <select name="categorySlug" value={subcategory} onChange={(event) => changeSubcategory(event.target.value, event.currentTarget.form)} className={fieldClass} disabled={!parent}>
          <option value="__all__">{parent ? 'All subcategories' : 'Select main category first'}</option>
          {subcategories.map((category) => <option key={category.categorySlug} value={category.categorySlug}>{category.categoryName ?? category.categorySlug}</option>)}
        </select>
      </label>
      <label className="grid gap-2">
        <span className={labelClass}>Product taxonomy</span>
        <select name="taxonomyLabel" value={taxonomyLabel} onChange={(event) => setTaxonomyLabel(event.target.value)} className={fieldClass} disabled={!parent || !subcategory}>
          <option value="">{!parent || !subcategory ? 'Select subcategory first' : 'None'}</option>
          {taxonomyOptions.map((item) => <option key={item.label} value={item.label}>{item.label} ({item.campaignCount})</option>)}
        </select>
      </label>
    </>
  )
}
