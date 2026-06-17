   export default {                                                                                     
     plugins: {                                                                                         
       // 以前は 'tailwindcss': {} だったかもしれませんが、                                             
       // 新しいパッケージ名 '@tailwindcss/postcss' を使用します。                                      
       '@tailwindcss/postcss': {},                                                                      
       autoprefixer: {}, // autoprefixerも通常は必要です                                                
     },                                                                                                 
   };         