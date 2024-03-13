(function(){if(typeof window==='undefined'){return;}
const slice=Array.prototype.slice;const matches=Element.prototype.matches||Element.prototype.msMatchesSelector;const _focusableElementsString=['a[href]','area[href]','input:not([disabled])','select:not([disabled])','textarea:not([disabled])','button:not([disabled])','details','summary','iframe','object','embed','[contenteditable]'].join(',');class InertRoot{constructor(rootElement,inertManager){this._inertManager=inertManager;this._rootElement=rootElement;this._managedNodes=new Set();if(this._rootElement.hasAttribute('aria-hidden')){this._savedAriaHidden=this._rootElement.getAttribute('aria-hidden');}else{this._savedAriaHidden=null;}
this._rootElement.setAttribute('aria-hidden','true');this._makeSubtreeUnfocusable(this._rootElement);this._observer=new MutationObserver(this._onMutation.bind(this));this._observer.observe(this._rootElement,{attributes:true,childList:true,subtree:true});}
destructor(){this._observer.disconnect();if(this._rootElement){if(this._savedAriaHidden!==null){this._rootElement.setAttribute('aria-hidden',this._savedAriaHidden);}else{this._rootElement.removeAttribute('aria-hidden');}}
this._managedNodes.forEach(function(inertNode){this._unmanageNode(inertNode.node);},this);this._observer=(null);this._rootElement=(null);this._managedNodes=(null);this._inertManager=(null);}
get managedNodes(){return new Set(this._managedNodes);}
get hasSavedAriaHidden(){return this._savedAriaHidden!==null;}
set savedAriaHidden(ariaHidden){this._savedAriaHidden=ariaHidden;}
get savedAriaHidden(){return this._savedAriaHidden;}
_makeSubtreeUnfocusable(startNode){composedTreeWalk(startNode,(node)=>this._visitNode(node));let activeElement=document.activeElement;if(!document.body.contains(startNode)){let node=startNode;let root=undefined;while(node){if(node.nodeType===Node.DOCUMENT_FRAGMENT_NODE){root=(node);break;}
node=node.parentNode;}
if(root){activeElement=root.activeElement;}}
if(startNode.contains(activeElement)){activeElement.blur();if(activeElement===document.activeElement){document.body.focus();}}}
_visitNode(node){if(node.nodeType!==Node.ELEMENT_NODE){return;}
const element=(node);if(element!==this._rootElement&&element.hasAttribute('inert')){this._adoptInertRoot(element);}
if(matches.call(element,_focusableElementsString)||element.hasAttribute('tabindex')){this._manageNode(element);}}
_manageNode(node){const inertNode=this._inertManager.register(node,this);this._managedNodes.add(inertNode);}
_unmanageNode(node){const inertNode=this._inertManager.deregister(node,this);if(inertNode){this._managedNodes.delete(inertNode);}}
_unmanageSubtree(startNode){composedTreeWalk(startNode,(node)=>this._unmanageNode(node));}
_adoptInertRoot(node){let inertSubroot=this._inertManager.getInertRoot(node);if(!inertSubroot){this._inertManager.setInert(node,true);inertSubroot=this._inertManager.getInertRoot(node);}
inertSubroot.managedNodes.forEach(function(savedInertNode){this._manageNode(savedInertNode.node);},this);}
_onMutation(records,self){records.forEach(function(record){const target=(record.target);if(record.type==='childList'){slice.call(record.addedNodes).forEach(function(node){this._makeSubtreeUnfocusable(node);},this);slice.call(record.removedNodes).forEach(function(node){this._unmanageSubtree(node);},this);}else if(record.type==='attributes'){if(record.attributeName==='tabindex'){this._manageNode(target);}else if(target!==this._rootElement&&record.attributeName==='inert'&&target.hasAttribute('inert')){this._adoptInertRoot(target);const inertSubroot=this._inertManager.getInertRoot(target);this._managedNodes.forEach(function(managedNode){if(target.contains(managedNode.node)){inertSubroot._manageNode(managedNode.node);}});}}},this);}}
class InertNode{constructor(node,inertRoot){this._node=node;this._overrodeFocusMethod=false;this._inertRoots=new Set([inertRoot]);this._savedTabIndex=null;this._destroyed=false;this.ensureUntabbable();}
destructor(){this._throwIfDestroyed();if(this._node&&this._node.nodeType===Node.ELEMENT_NODE){const element=(this._node);if(this._savedTabIndex!==null){element.setAttribute('tabindex',this._savedTabIndex);}else{element.removeAttribute('tabindex');}
if(this._overrodeFocusMethod){delete element.focus;}}
this._node=(null);this._inertRoots=(null);this._destroyed=true;}
get destroyed(){return(this)._destroyed;}
_throwIfDestroyed(){if(this.destroyed){throw new Error('Trying to access destroyed InertNode');}}
get hasSavedTabIndex(){return this._savedTabIndex!==null;}
get node(){this._throwIfDestroyed();return this._node;}
set savedTabIndex(tabIndex){this._throwIfDestroyed();this._savedTabIndex=tabIndex;}
get savedTabIndex(){this._throwIfDestroyed();return this._savedTabIndex;}
ensureUntabbable(){if(this.node.nodeType!==Node.ELEMENT_NODE){return;}
const element=(this.node);if(matches.call(element,_focusableElementsString)){if((element).tabIndex===-1&&this.hasSavedTabIndex){return;}
if(element.hasAttribute('tabindex')){this._savedTabIndex=(element).tabIndex;}
element.setAttribute('tabindex','-1');if(element.nodeType===Node.ELEMENT_NODE){element.focus=function(){};this._overrodeFocusMethod=true;}}else if(element.hasAttribute('tabindex')){this._savedTabIndex=(element).tabIndex;element.removeAttribute('tabindex');}}
addInertRoot(inertRoot){this._throwIfDestroyed();this._inertRoots.add(inertRoot);}
removeInertRoot(inertRoot){this._throwIfDestroyed();this._inertRoots.delete(inertRoot);if(this._inertRoots.size===0){this.destructor();}}}
class InertManager{constructor(document){if(!document){throw new Error('Missing required argument; InertManager needs to wrap a document.');}
this._document=document;this._managedNodes=new Map();this._inertRoots=new Map();this._observer=new MutationObserver(this._watchForInert.bind(this));addInertStyle(document.head||document.body||document.documentElement);if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',this._onDocumentLoaded.bind(this));}else{this._onDocumentLoaded();}}
setInert(root,inert){if(inert){if(this._inertRoots.has(root)){return;}
const inertRoot=new InertRoot(root,this);root.setAttribute('inert','');this._inertRoots.set(root,inertRoot);if(!this._document.body.contains(root)){let parent=root.parentNode;while(parent){if(parent.nodeType===11){addInertStyle(parent);}
parent=parent.parentNode;}}}else{if(!this._inertRoots.has(root)){return;}
const inertRoot=this._inertRoots.get(root);inertRoot.destructor();this._inertRoots.delete(root);root.removeAttribute('inert');}}
getInertRoot(element){return this._inertRoots.get(element);}
register(node,inertRoot){let inertNode=this._managedNodes.get(node);if(inertNode!==undefined){inertNode.addInertRoot(inertRoot);}else{inertNode=new InertNode(node,inertRoot);}
this._managedNodes.set(node,inertNode);return inertNode;}
deregister(node,inertRoot){const inertNode=this._managedNodes.get(node);if(!inertNode){return null;}
inertNode.removeInertRoot(inertRoot);if(inertNode.destroyed){this._managedNodes.delete(node);}
return inertNode;}
_onDocumentLoaded(){const inertElements=slice.call(this._document.querySelectorAll('[inert]'));inertElements.forEach(function(inertElement){this.setInert(inertElement,true);},this);this._observer.observe(this._document.body||this._document.documentElement,{attributes:true,subtree:true,childList:true});}
_watchForInert(records,self){const _this=this;records.forEach(function(record){switch(record.type){case'childList':slice.call(record.addedNodes).forEach(function(node){if(node.nodeType!==Node.ELEMENT_NODE){return;}
const inertElements=slice.call(node.querySelectorAll('[inert]'));if(matches.call(node,'[inert]')){inertElements.unshift(node);}
inertElements.forEach(function(inertElement){this.setInert(inertElement,true);},_this);},_this);break;case'attributes':if(record.attributeName!=='inert'){return;}
const target=(record.target);const inert=target.hasAttribute('inert');_this.setInert(target,inert);break;}},this);}}
function composedTreeWalk(node,callback,shadowRootAncestor){if(node.nodeType==Node.ELEMENT_NODE){const element=(node);if(callback){callback(element);}
const shadowRoot=(element).shadowRoot;if(shadowRoot){composedTreeWalk(shadowRoot,callback,shadowRoot);return;}
if(element.localName=='content'){const content=(element);const distributedNodes=content.getDistributedNodes?content.getDistributedNodes():[];for(let i=0;i<distributedNodes.length;i++){composedTreeWalk(distributedNodes[i],callback,shadowRootAncestor);}
return;}
if(element.localName=='slot'){const slot=(element);const distributedNodes=slot.assignedNodes?slot.assignedNodes({flatten:true}):[];for(let i=0;i<distributedNodes.length;i++){composedTreeWalk(distributedNodes[i],callback,shadowRootAncestor);}
return;}}
let child=node.firstChild;while(child!=null){composedTreeWalk(child,callback,shadowRootAncestor);child=child.nextSibling;}}
function addInertStyle(node){if(node.querySelector('style#inert-style, link#inert-style')){return;}
const style=document.createElement('style');style.setAttribute('id','inert-style');style.textContent='\n'+'[inert] {\n'+'  pointer-events: none;\n'+'  cursor: default;\n'+'}\n'+'\n'+'[inert], [inert] * {\n'+'  -webkit-user-select: none;\n'+'  -moz-user-select: none;\n'+'  -ms-user-select: none;\n'+'  user-select: none;\n'+'}\n';node.appendChild(style);}
if(!Element.prototype.hasOwnProperty('inert')){const inertManager=new InertManager(document);Object.defineProperty(Element.prototype,'inert',{enumerable:true,get:function(){return this.hasAttribute('inert');},set:function(inert){inertManager.setInert(this,inert);},});}})();