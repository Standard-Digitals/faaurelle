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
  shipping: "Shipping Policy",
  cancellationAndRefund: "Cancellation & Refund Policy",
  returns: "Return & Replacement Policy",
  faq: "FAQ",
  terms: "Terms & Conditions",
} as const;

export const customerCareItems = [
  { label: customerCareLabels.shipping, href: "/shipping-policy" },
  {
    label: customerCareLabels.cancellationAndRefund,
    href: "/refund-and-cancellation-policy",
  },
  { label: customerCareLabels.returns, href: "/return-and-replacement-policy" },
  { label: customerCareLabels.terms, href: "/terms-and-conditions" },
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
