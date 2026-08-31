export const primaryNavigationLinks = [
  { label: "Discover", href: "#discover" },
  { label: "Silk Botanique Fusion", href: "#silk-botanique-fusion" },
  { label: "Transformations", href: "#transformations" },
] as const;

export const innerCircleLink = {
  label: "The Inner Circle",
  href: "#inner-circle",
} as const;

export const sharedNavigationLinks = [...primaryNavigationLinks, innerCircleLink] as const;

export const customerCareLabels = {
  heading: "Customer care",
  contact: "Contact",
  shipping: "Shipping",
  returns: "Returns",
  faq: "FAQ",
  privacy: "Privacy",
  terms: "Terms",
} as const;

export const customerCareItems = [
  customerCareLabels.contact,
  customerCareLabels.shipping,
  customerCareLabels.returns,
  customerCareLabels.faq,
  customerCareLabels.privacy,
  customerCareLabels.terms,
] as const;

export const navigationAccessibility = {
  primary: "Primary navigation",
  secondary: "Secondary navigation",
  mobile: "Mobile navigation",
  menu: "Navigation menu",
  openMenu: "Open navigation menu",
  closeMenu: "Close navigation menu",
  utilities: "Site utilities",
  search: "Search",
  account: "Account",
  shoppingBag: "Shopping bag",
} as const;
